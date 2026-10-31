import "server-only";
import { z } from "zod";
import type { CategoryId, FinancialProfile } from "../types";
import { newId, nowIso, readDb, updateDb } from "../db";
import { aiAvailable, aiObject } from "../ai";
import { CATEGORY_IDS, getCategory } from "../categories";
import { formatINR } from "../format";
import { matchCategory, parseMoney } from "../simulate/nl";
import { generateNudges } from "./nudges";

/**
 * "My rent went up to 28k from November" → profile mutations. This is what makes the money model *living*.
 * Rules first; the LLM only handles sentences the rules miss, and only returns structured edits.
 */

type Edit =
  | { kind: "income"; amount: number }
  | { kind: "fixed"; label: string; category: CategoryId; amount: number }
  | { kind: "budget"; category: CategoryId; amount: number }
  | { kind: "emergency"; amount: number }
  | { kind: "goal_progress"; goal: string; amount: number };

function ruleEdits(text: string, p: FinancialProfile): Edit[] {
  const s = text.toLowerCase();
  const money = parseMoney(s.replace(/\d+\s*%/g, ""));
  const pct = s.match(/(\d+(?:\.\d+)?)\s*%/)?.[1];
  const edits: Edit[] = [];
  const up = !/(down|drop|decrease|reduc|cut|lower|less)/.test(s);
  const isTo = /\bto\b/.test(s);

  if (/\brent\b/.test(s) && (money || pct)) {
    const cur = p.fixedCosts.find((f) => f.category === "rent")?.amount ?? 0;
    const amount = money && isTo ? money : money ? cur + (up ? money : -money) : Math.round(cur * (1 + (up ? 1 : -1) * Number(pct) / 100));
    edits.push({ kind: "fixed", label: "Rent", category: "rent", amount });
  } else if (/(salary|raise|hike|income|pay|promot|new job|increment)/.test(s) && (money || pct)) {
    const amount = money && isTo ? money : money ? p.monthlyIncome + (up ? money : -money) : Math.round(p.monthlyIncome * (1 + (up ? 1 : -1) * Number(pct) / 100));
    edits.push({ kind: "income", amount });
  } else if (/\bsip\b|invest/.test(s) && money) {
    const cur = p.fixedCosts.find((f) => f.category === "investments")?.amount ?? 0;
    edits.push({ kind: "fixed", label: "Monthly SIP", category: "investments", amount: /stop/.test(s) ? 0 : isTo ? money : cur + (up ? money : -money) });
  } else if (/\bemi\b|loan/.test(s) && money) {
    edits.push({ kind: "fixed", label: /phone/.test(s) ? "Phone EMI" : "Loan EMI", category: "emi", amount: /(paid off|closed|finished|ended)/.test(s) ? 0 : money });
  } else if (/emergency fund|savings account|rainy day/.test(s) && money) {
    edits.push({ kind: "emergency", amount: isTo ? money : p.emergencyFund.current + (up ? money : -money) });
  } else if (/budget/.test(s) && money) {
    const cat = matchCategory(s);
    if (cat) edits.push({ kind: "budget", category: cat, amount: money });
  } else {
    const goal = p.goals.find((g) => s.includes(g.name.toLowerCase().split(" ")[0].toLowerCase()) || s.includes(g.name.toLowerCase().split(" ").at(-1)!));
    if (goal && money && /(saved|put|added|moved)/.test(s)) edits.push({ kind: "goal_progress", goal: goal.id, amount: goal.currentAmount + money });
  }
  return edits;
}

const aiSchema = z.object({
  edits: z.array(
    z.object({
      kind: z.enum(["income", "fixed", "budget", "emergency", "goal_progress"]),
      label: z.string().optional(),
      category: z.enum(CATEGORY_IDS).optional(),
      goal: z.string().optional().describe("goal id"),
      amount: z.number().describe("the NEW monthly amount / new total in rupees"),
    }),
  ),
});

export async function applyLifeEvent(description: string): Promise<{ profile: FinancialProfile; changes: string[] }> {
  const db = await readDb();
  let edits = ruleEdits(description, db.profile);
  if (!edits.length && aiAvailable()) {
    try {
      const r = await aiObject({
        schema: aiSchema,
        system: `Convert a life update into edits of a personal finance profile. Return NEW values (not deltas), in rupees. 3k = 3000, 1 lakh = 100000.
Profile: income ₹${db.profile.monthlyIncome}/month; fixed costs ${db.profile.fixedCosts.map((f) => `${f.label} (${f.category}) ₹${f.amount}`).join(", ")};
budgets ${JSON.stringify(db.profile.categoryBudgets)}; goals ${db.profile.goals.map((g) => `${g.id}: ${g.name} ₹${g.currentAmount}/${g.targetAmount}`).join("; ")}.
Only include what the user actually said changed.`,
        prompt: description,
      });
      edits = r.edits.map((e) =>
        e.kind === "fixed"
          ? { kind: "fixed", label: e.label ?? getCategory(e.category ?? "other").label, category: e.category ?? "other", amount: e.amount }
          : e.kind === "budget"
            ? { kind: "budget", category: e.category ?? "other", amount: e.amount }
            : e.kind === "goal_progress"
              ? { kind: "goal_progress", goal: e.goal ?? "", amount: e.amount }
              : { kind: e.kind, amount: e.amount },
      ) as Edit[];
    } catch {
      /* fall through */
    }
  }
  if (!edits.length) throw new Error("I couldn't tell what changed. Try “my rent went up to 28k” or “got a raise to 1.1 lakh”.");

  const changes: string[] = [];
  const profile = await updateDb((d) => {
    const p = d.profile;
    for (const e of edits) {
      if (e.kind === "income") {
        changes.push(`Income ${formatINR(p.monthlyIncome)} → ${formatINR(e.amount)}`);
        p.monthlyIncome = Math.max(0, Math.round(e.amount));
      } else if (e.kind === "fixed") {
        const f = p.fixedCosts.find((x) => x.category === e.category && (e.category !== "emi" || x.label === e.label)) ?? p.fixedCosts.find((x) => x.label.toLowerCase() === e.label.toLowerCase());
        if (f) {
          changes.push(`${f.label} ${formatINR(f.amount)} → ${formatINR(e.amount)}`);
          f.amount = Math.max(0, Math.round(e.amount));
        } else {
          changes.push(`New fixed cost: ${e.label} ${formatINR(e.amount)}`);
          p.fixedCosts.push({ id: newId(), label: e.label, category: e.category, amount: Math.round(e.amount) });
        }
        p.fixedCosts = p.fixedCosts.filter((x) => x.amount > 0);
      } else if (e.kind === "budget") {
        changes.push(`${getCategory(e.category).label} budget → ${formatINR(e.amount)}`);
        p.categoryBudgets[e.category] = Math.round(e.amount);
      } else if (e.kind === "emergency") {
        changes.push(`Emergency fund ${formatINR(p.emergencyFund.current)} → ${formatINR(e.amount)}`);
        p.emergencyFund.current = Math.max(0, Math.round(e.amount));
      } else if (e.kind === "goal_progress") {
        const g = p.goals.find((x) => x.id === e.goal);
        if (g) {
          changes.push(`${g.name}: ${formatINR(g.currentAmount)} → ${formatINR(e.amount)} saved`);
          g.currentAmount = Math.round(e.amount);
        }
      }
    }
    p.lifeEvents.push({ id: newId(), date: nowIso().slice(0, 10), description: description.trim() });
    p.updatedAt = nowIso();
    return structuredClone(p);
  });
  await generateNudges().catch(() => []);
  return { profile, changes };
}
