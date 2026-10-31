import type { CategoryId, FinancialProfile, Transaction } from "../types";
import { isSpendCategory } from "../categories";
import { addMonths } from "../format";

/** Categories already represented by profile.fixedCosts — excluded from variable spend. */
export const FIXED_CATEGORIES: CategoryId[] = ["rent", "emi", "utilities", "investments", "insurance"];

export interface Baseline {
  /** Months (YYYY-MM) the averages were taken from */
  window: string[];
  /** Latest month that has data */
  latestMonth: string;
  /** First projected month = month after latestMonth */
  startMonth: string;
  monthlyIncome: number;
  /** Fixed costs excluding investments (rent, EMI, bills) */
  fixedEssentials: number;
  /** SIP / investments committed every month (counts as saving, not spending) */
  investing: number;
  variableByCategory: Partial<Record<CategoryId, number>>;
  variableTotal: number;
  /** Cash left each month after everything — what funds goals */
  cashSurplus: number;
  /** cashSurplus + investing */
  totalSavings: number;
  /** essentials + variable, excluding investing */
  monthlyExpenses: number;
  emergencyFundMonths: number;
}

/** Latest month with data; "now" for the whole engine (seed data ends Oct 2026). */
export function latestDataMonth(transactions: Transaction[], fallback = new Date().toISOString().slice(0, 7)): string {
  return transactions.reduce((m, t) => (t.date.slice(0, 7) > m ? t.date.slice(0, 7) : m), "") || fallback;
}

export function buildBaseline(profile: FinancialProfile, transactions: Transaction[]): Baseline {
  const counts = new Map<string, number>();
  for (const t of transactions) counts.set(t.date.slice(0, 7), (counts.get(t.date.slice(0, 7)) ?? 0) + 1);
  // Use the last 3 months that look complete (≥10 transactions); fall back to whatever exists.
  const months = [...counts.keys()].sort();
  const full = months.filter((m) => (counts.get(m) ?? 0) >= 10);
  const window = (full.length ? full : months).slice(-3);
  const latestMonth = latestDataMonth(transactions);

  const variableByCategory: Partial<Record<CategoryId, number>> = {};
  for (const t of transactions) {
    if (t.direction !== "debit" || !window.includes(t.date.slice(0, 7))) continue;
    if (!isSpendCategory(t.category) || FIXED_CATEGORIES.includes(t.category)) continue;
    variableByCategory[t.category] = (variableByCategory[t.category] ?? 0) + t.amount / Math.max(window.length, 1);
  }
  for (const k of Object.keys(variableByCategory) as CategoryId[]) variableByCategory[k] = Math.round(variableByCategory[k]!);

  let income = profile.monthlyIncome;
  if (!income) {
    const credits = window.map((m) =>
      transactions.filter((t) => t.category === "income" && t.date.startsWith(m)).reduce((s, t) => s + t.amount, 0),
    );
    income = credits.sort((a, b) => a - b)[Math.floor(credits.length / 2)] ?? 0;
  }

  const investing = profile.fixedCosts.filter((f) => f.category === "investments").reduce((s, f) => s + f.amount, 0);
  const fixedEssentials = profile.fixedCosts.filter((f) => f.category !== "investments").reduce((s, f) => s + f.amount, 0);
  const variableTotal = Object.values(variableByCategory).reduce((s, v) => s + (v ?? 0), 0);
  const monthlyExpenses = fixedEssentials + variableTotal;
  const cashSurplus = income - fixedEssentials - investing - variableTotal;

  return {
    window,
    latestMonth,
    startMonth: addMonths(latestMonth, 1),
    monthlyIncome: income,
    fixedEssentials,
    investing,
    variableByCategory,
    variableTotal,
    cashSurplus,
    totalSavings: cashSurplus + investing,
    monthlyExpenses,
    emergencyFundMonths: profile.emergencyFund.current / Math.max(monthlyExpenses, 1),
  };
}
