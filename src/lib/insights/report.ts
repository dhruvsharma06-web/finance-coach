import "server-only";
import { z } from "zod";
import type { CategoryId, CategorySpend, MonthlyReport } from "../types";
import { readDb, updateDb } from "../db";
import { aiAvailable, aiObject, COACH_GUARDRAILS } from "../ai";
import { getCategory, isSpendCategory } from "../categories";
import { addMonths, formatINR, monthLabel } from "../format";
import { simulate } from "../simulate";

/**
 * Monthly review. Every number is computed here; the LLM (if any) only writes
 * wins / watch-outs / narrative from those numbers. Cached per month until data changes.
 */

const PER_MONTH = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 } as const;

export async function reportMonths(): Promise<string[]> {
  const db = await readDb();
  return [...new Set(db.transactions.map((t) => t.date.slice(0, 7)))].sort().reverse();
}

export async function buildMonthlyReport(month: string): Promise<MonthlyReport> {
  const db = await readDb();
  const inMonth = db.transactions.filter((t) => t.date.startsWith(month));
  const fingerprint = `${inMonth.length}:${Math.round(inMonth.reduce((s, t) => s + t.amount, 0))}:${inMonth.map((t) => t.category).join("").length}:${JSON.stringify(db.profile.goals.map((g) => g.currentAmount))}`;
  const cached = db.reports.find((r) => r.month === month) as (MonthlyReport & { fingerprint?: string }) | undefined;
  if (cached?.fingerprint === fingerprint) return cached;

  const prevMonth = addMonths(month, -1);
  const sumBy = (m: string) => {
    const map = new Map<CategoryId, { amount: number; count: number }>();
    for (const t of db.transactions) {
      if (!t.date.startsWith(m) || t.direction !== "debit" || !isSpendCategory(t.category)) continue;
      const e = map.get(t.category) ?? { amount: 0, count: 0 };
      e.amount += t.amount;
      e.count++;
      map.set(t.category, e);
    }
    return map;
  };
  const cur = sumBy(month);
  const prev = sumBy(prevMonth);

  const income = inMonth.filter((t) => t.direction === "credit").reduce((s, t) => s + t.amount, 0);
  const spending = [...cur.values()].reduce((s, e) => s + e.amount, 0);
  const savings = income - spending;
  const byCategory: CategorySpend[] = [...cur.entries()]
    .map(([category, e]) => {
      const p = prev.get(category)?.amount;
      return { category, amount: Math.round(e.amount), budget: db.profile.categoryBudgets[category], changePct: p ? ((e.amount - p) / p) * 100 : null, txnCount: e.count };
    })
    .sort((a, b) => b.amount - a.amount);

  const merchants = new Map<string, { amount: number; count: number }>();
  for (const t of inMonth) {
    if (t.direction !== "debit" || !isSpendCategory(t.category) || ["rent", "emi"].includes(t.category)) continue;
    const e = merchants.get(t.merchant) ?? { amount: 0, count: 0 };
    e.amount += t.amount;
    e.count++;
    merchants.set(t.merchant, e);
  }
  const topMerchants = [...merchants.entries()].map(([merchant, e]) => ({ merchant, amount: Math.round(e.amount), count: e.count })).sort((a, b) => b.amount - a.amount).slice(0, 5);
  const recurringTotal = Math.round(db.recurring.filter((r) => r.status !== "cancelled").reduce((s, r) => s + r.lastAmount * PER_MONTH[r.cadence], 0));
  const sim = simulate(db.profile, db.transactions, { name: "Today's plan", changes: [] });
  const goalsProgress = db.profile.goals.map((g) => ({
    goalId: g.id,
    name: g.name,
    pct: Math.min(1, g.currentAmount / g.targetAmount),
    onTrack: sim.goals.find((x) => x.goalId === g.id)?.onTrackBaseline ?? false,
  }));

  // Deterministic wins / watch-outs
  const wins: string[] = [];
  const watchouts: string[] = [];
  const rate = income ? savings / income : 0;
  if (rate >= 0.2) wins.push(`You kept ${Math.round(rate * 100)}% of your income, above the 20% many planners aim for.`);
  for (const c of byCategory) {
    const label = getCategory(c.category).label;
    if (c.budget && c.amount <= c.budget * 0.9) wins.push(`${label} came in at ${formatINR(c.amount)}, under your ${formatINR(c.budget)} budget.`);
    if (c.budget && c.amount > c.budget * 1.1) watchouts.push(`${label} hit ${formatINR(c.amount)} against a ${formatINR(c.budget)} plan (${Math.round((c.amount / c.budget - 1) * 100)}% over).`);
    else if (c.changePct !== null && c.changePct > 30 && c.amount > 2000) watchouts.push(`${label} rose ${Math.round(c.changePct)}% from last month.`);
  }
  for (const r of db.recurring.filter((x) => x.status === "price_changed" && x.priceChange && x.priceChange.to > x.priceChange.from)) {
    watchouts.push(`${r.merchant} raised its price to ${formatINR(r.priceChange!.to)}.`);
  }
  const top = topMerchants[0];
  if (top) watchouts.push(`${top.merchant} was your biggest spend outside rent: ${formatINR(top.amount)} across ${top.count} payments.`);

  const lead = byCategory.filter((c) => !["rent", "emi", "utilities"].includes(c.category))[0];
  let report: MonthlyReport = {
    month,
    totals: { income, spending, savings, savingsRate: rate },
    byCategory,
    topMerchants,
    recurringTotal,
    goalsProgress,
    wins: wins.slice(0, 3),
    watchouts: watchouts.slice(0, 3),
    narrative: [
      `${monthLabel(month).split(" ")[0]} brought in ${formatINR(income)} and ${formatINR(spending)} went out, leaving ${formatINR(savings)}. That's a ${Math.round(rate * 100)}% savings rate.`,
      lead ? `${getCategory(lead.category).label} was where your choices mattered most at ${formatINR(lead.amount)}${lead.changePct !== null ? `, ${lead.changePct >= 0 ? "up" : "down"} ${Math.abs(Math.round(lead.changePct))}% from last month` : ""}.${top ? ` ${top.merchant} alone took ${formatINR(top.amount)}.` : ""}` : "",
      `${(() => { const n = goalsProgress.filter((g) => g.onTrack).length; return n === goalsProgress.length ? "Every goal is on track." : `${n} of your ${goalsProgress.length} goals ${n === 1 ? "is" : "are"} on track.`; })()} For next month, pick one category and set yourself a weekly limit. Small, specific limits stick better than big resolutions.`,
    ].filter(Boolean).join("\n\n"),
    generatedAt: new Date().toISOString(),
  };

  if (aiAvailable()) {
    try {
      const ai = await aiObject({
        schema: z.object({ wins: z.array(z.string()).max(3), watchouts: z.array(z.string()).max(3), narrative: z.string() }),
        system: `${COACH_GUARDRAILS}
Write ${db.profile.name}'s monthly money review from the JSON. Use ONLY these numbers, formatted as given. Never invent figures.
wins/watchouts: 3 each, one sentence, specific. narrative: 2–3 short paragraphs separated by a blank line, second person, warm,
ending with one concrete behavioural suggestion for next month (never a financial product).`,
        prompt: JSON.stringify({ ...report, narrative: undefined, deterministicWins: report.wins, deterministicWatchouts: report.watchouts }),
      });
      report = { ...report, wins: ai.wins.length ? ai.wins : report.wins, watchouts: ai.watchouts.length ? ai.watchouts : report.watchouts, narrative: ai.narrative || report.narrative };
    } catch {
      /* keep the template */
    }
  }

  await updateDb((d) => {
    d.reports = [...d.reports.filter((r) => r.month !== month), { ...report, fingerprint } as MonthlyReport];
  });
  return report;
}
