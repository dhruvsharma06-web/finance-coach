import type { MonthlyReport } from "../types";
import { readDb } from "../db";
import { isSpendCategory } from "../categories";

/**
 * LANE C (friend's Codex). Monthly review report.
 * Compute every number deterministically, then (if aiAvailable) ask the LLM for
 * wins / watchouts / narrative given ONLY those numbers + COACH_GUARDRAILS.
 * Cache in db.reports by month. Template fallback when there is no AI key.
 * Stub: totals only.
 */
export async function buildMonthlyReport(month: string): Promise<MonthlyReport> {
  const db = await readDb();
  const txns = db.transactions.filter((t) => t.date.startsWith(month));
  const income = txns.filter((t) => t.direction === "credit").reduce((s, t) => s + t.amount, 0);
  const spending = txns
    .filter((t) => t.direction === "debit" && isSpendCategory(t.category))
    .reduce((s, t) => s + t.amount, 0);
  return {
    month,
    totals: { income, spending, savings: income - spending, savingsRate: income ? (income - spending) / income : 0 },
    byCategory: [],
    topMerchants: [],
    recurringTotal: 0,
    goalsProgress: [],
    wins: [],
    watchouts: [],
    narrative: "Report stub — Lane C generates the full review.",
    generatedAt: new Date().toISOString(),
  };
}
