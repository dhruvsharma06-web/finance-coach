import { z } from "zod";
import type { Scenario, ScenarioChange } from "../types";
import { readDb } from "../db";
import { aiAvailable, aiObject } from "../ai";
import { CATEGORIES, CATEGORY_IDS } from "../categories";
import { buildBaseline } from "./baseline";
import { matchCategory, parseMoney, parseStart } from "./nl";

/**
 * Natural language → Scenario. Regex rules first (instant, no key needed);
 * the LLM only handles sentences the rules can't. The LLM never does math.
 */

const SUGGESTIONS = [
  "What if I cut dining out by 30%?",
  "What if my rent goes up by 3,000 from January?",
  "What if I get a 15% raise in April?",
  "What if I buy a ₹60,000 phone next month?",
];
export class ScenarioParseError extends Error {
  suggestions = SUGGESTIONS;
}

const pctOf = (s: string) => {
  const m = s.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/i);
  return m ? Number(m[1]) : null;
};

function parseClause(
  clause: string,
  ctx: { startMonth: string; rent: number; income: number; unusedSubs: number },
): ScenarioChange[] {
  const s = clause.toLowerCase().trim();
  if (!s) return [];
  const startMonth = parseStart(s, ctx.startMonth);
  const pct = pctOf(s);
  const money = parseMoney(
    s
      .replace(/\d+(?:\.\d+)?\s*(?:%|percent)/g, "")
      .replace(/in \d+ months?/g, ""),
  );
  const cat = matchCategory(s);

  // Rent / housing
  if (/\brent\b/.test(s)) {
    const down =
      /\b(kam|ghata|down|drops?|decreases?|reduces?|lower|cheaper|less)\b/.test(
        s,
      );
    const to = s.match(
      /rent\s+(?:goes|going|went|rises?|increases?|is)?\s*(?:up\s+)?to\s+([₹\d.,]+\s*(?:k|lakh|l)?)/,
    );
    const delta = to
      ? (parseMoney(to[1]) ?? ctx.rent) - ctx.rent
      : pct !== null
        ? (ctx.rent * pct) / 100
        : (money ?? Math.round(ctx.rent * 0.1));
    return [
      {
        kind: "fixed_cost_abs",
        label: "Rent",
        value: Math.round(down && !to ? -Math.abs(delta) : delta),
        startMonth,
      },
    ];
  }

  // Income
  if (
    /raise|hike|increment|salary|income|promotion|pay ?cut|lose my job|job loss|bonus/.test(
      s,
    ) &&
    !cat
  ) {
    if (/bonus/.test(s) && money)
      return [{ kind: "one_time", label: "Bonus", value: -money, startMonth }];
    if (/lose my job|job loss|laid off/.test(s))
      return [{ kind: "income_pct", value: -100, startMonth }];
    const down =
      /cut|drops?|decreases?|less|lower|pay ?cut|\bkam\b|\bghata\b/.test(s);
    if (money && /ho gay[ia]|ho gyi|ab.*salary/.test(s))
      return [{ kind: "income_abs", value: money - ctx.income, startMonth }];
    const to = s.match(/(?:to|of)\s+([₹\d.,]+\s*(?:k|lakh|l)?)(?!\s*%)/);
    if (pct !== null)
      return [{ kind: "income_pct", value: down ? -pct : pct, startMonth }];
    if (to && /\bto\b/.test(s)) {
      const target = parseMoney(to[1]);
      if (target)
        return [{ kind: "income_abs", value: target - ctx.income, startMonth }];
    }
    if (money)
      return [{ kind: "income_abs", value: down ? -money : money, startMonth }];
    return [{ kind: "income_pct", value: down ? -10 : 10, startMonth }];
  }

  // Cancel subscriptions
  if (/cancel/.test(s) && /subscription|unused|hotstar|netflix|ott/.test(s)) {
    return [
      {
        kind: "category_abs",
        category: "subscriptions",
        value: -(money ?? ctx.unusedSubs),
        startMonth,
      },
    ];
  }

  // One-off purchase or windfall
  if (
    /\b(buy|buying|purchase|spend|get a|trip|wedding|laptop|phone|bike|car)\b/.test(
      s,
    ) &&
    money &&
    !/(a|per|each|every) month|monthly|\/mo/.test(s) &&
    !/cut|reduce|less/.test(s)
  ) {
    return [
      {
        kind: "one_time",
        label: s.match(/(phone|laptop|bike|car|trip|wedding)/)?.[1],
        value: money,
        startMonth: /next month/.test(s) || startMonth ? startMonth : 1,
      },
    ];
  }

  // New recurring cost
  if (
    /(add|start|join|take|new|subscribe)/.test(s) &&
    money &&
    /(month|monthly|membership|subscription|emi|\/mo)/.test(s)
  ) {
    return [
      {
        kind: "new_recurring",
        label: s.match(/(gym|membership|subscription|emi|sip|course)/)?.[1],
        value: money,
        startMonth,
      },
    ];
  }

  // Category spending change
  if (cat) {
    const down =
      /(cut|reduce|lower|less|decrease|drop|stop|quit|halve|save on|\bkam\b|\bghata\b)/.test(
        s,
      );
    if (/halve|half|\baadh[ai]\b|\badh[ai]\b/.test(s))
      return [{ kind: "category_pct", category: cat, value: -50, startMonth }];
    if (/stop|quit|no more/.test(s))
      return [{ kind: "category_pct", category: cat, value: -100, startMonth }];
    if (pct !== null)
      return [
        {
          kind: "category_pct",
          category: cat,
          value: down ? -pct : pct,
          startMonth,
        },
      ];
    if (money)
      return [
        {
          kind: "category_abs",
          category: cat,
          value: down ? -money : money,
          startMonth,
        },
      ];
    return [
      {
        kind: "category_pct",
        category: cat,
        value: down ? -20 : 20,
        startMonth,
      },
    ];
  }
  return [];
}

const changeSchema = z.object({
  name: z.string().describe("3–6 word title"),
  changes: z.array(
    z.object({
      kind: z.enum([
        "category_pct",
        "category_abs",
        "income_pct",
        "income_abs",
        "fixed_cost_abs",
        "one_time",
        "new_recurring",
      ]),
      category: z.enum(CATEGORY_IDS).optional(),
      label: z.string().optional(),
      value: z.number(),
      startMonth: z.number().int().min(0).max(35).optional(),
    }),
  ),
});

export async function parseScenario(prompt: string): Promise<Scenario> {
  const db = await readDb();
  const b = buildBaseline(db.profile, db.transactions);
  const ctx = {
    startMonth: b.startMonth,
    rent: db.profile.fixedCosts.find((f) => f.category === "rent")?.amount ?? 0,
    income: b.monthlyIncome,
    unusedSubs:
      db.recurring
        .filter((r) => r.isSubscription && r.status === "possibly_unused")
        .reduce((s, r) => s + r.lastAmount, 0) || 299,
  };
  const text = prompt.replace(
    /^(what if|what happens if|suppose|if)\s+(i|my)?\s*/i,
    (m) => m.replace(/^(what if|what happens if|suppose|if)\s+/i, ""),
  );
  const clauses = text
    .split(/\s*(?:,(?!\d)|;|\band\b|\balso\b|\bplus\b)\s*/i)
    .filter(Boolean);
  const changes = clauses.flatMap((c) => parseClause(c, ctx));
  const name = prompt.replace(/^what if\s+/i, "").replace(/\?$/, "");

  if (changes.length || !aiAvailable())
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      prompt,
      changes,
    };

  try {
    const r = await aiObject({
      schema: changeSchema,
      system: `Turn a personal-finance what-if into structured changes. Months are offsets from ${b.startMonth} (0 = that month).
Categories: ${CATEGORIES.map((c) => `${c.id} (${c.label})`).join(", ")}.
Fixed costs: ${db.profile.fixedCosts.map((f) => `${f.label} ₹${f.amount}`).join(", ")}. Income ₹${b.monthlyIncome}/month.
category_pct value -30 = cut 30%. one_time positive = expense, negative = windfall. fixed_cost_abs value = monthly delta in ₹.
Only output changes the user actually described. Amounts: 3k = 3000, 1 lakh = 100000.`,
      prompt,
    });
    return { name: r.name, prompt, changes: r.changes };
  } catch {
    return { name, prompt, changes: [] };
  }
}
