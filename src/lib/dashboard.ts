import type { BudgetPace, CategoryId, CategorySpend, DashboardSummary, Database } from "./types";
import { isSpendCategory } from "./categories";
import { addMonths } from "./format";

/**
 * LANE A (Claude). Aggregates the dashboard view from the DB.
 * `month` defaults to the latest month that has transactions.
 */
export function buildDashboard(db: Database, month?: string, today = new Date()): DashboardSummary {
  const latest = db.transactions.at(-1)?.date.slice(0, 7) ?? today.toISOString().slice(0, 7);
  const m = month ?? latest;
  const prev = addMonths(m, -1);

  const inMonth = db.transactions.filter((t) => t.date.startsWith(m));
  const inPrev = db.transactions.filter((t) => t.date.startsWith(prev));
  const income = inMonth.filter((t) => t.direction === "credit").reduce((s, t) => s + t.amount, 0);
  const debits = inMonth.filter((t) => t.direction === "debit" && isSpendCategory(t.category));
  const spending = debits.reduce((s, t) => s + t.amount, 0);

  const sumBy = (list: typeof inMonth) => {
    const map = new Map<CategoryId, { amount: number; count: number }>();
    for (const t of list) {
      if (t.direction !== "debit" || !isSpendCategory(t.category)) continue;
      const cur = map.get(t.category) ?? { amount: 0, count: 0 };
      cur.amount += t.amount;
      cur.count++;
      map.set(t.category, cur);
    }
    return map;
  };
  const cur = sumBy(inMonth);
  const before = sumBy(inPrev);
  const byCategory: CategorySpend[] = [...cur.entries()]
    .map(([category, v]) => {
      const p = before.get(category)?.amount;
      return {
        category,
        amount: v.amount,
        budget: db.profile.categoryBudgets[category],
        changePct: p ? ((v.amount - p) / p) * 100 : null,
        txnCount: v.count,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const [y, mo] = m.split("-").map(Number);
  const daysInMonth = new Date(y, mo, 0).getDate();
  const isCurrent = today.toISOString().slice(0, 7) === m;
  const elapsed = isCurrent ? today.getDate() / daysInMonth : 1;
  const budgetPace: BudgetPace[] = Object.entries(db.profile.categoryBudgets).map(([category, budget]) => {
    const spent = cur.get(category as CategoryId)?.amount ?? 0;
    return { category: category as CategoryId, spent, budget: budget!, paceRatio: budget ? spent / (budget * elapsed) : 0 };
  });

  const daily = new Map<string, number>();
  // Day-to-day spend only: big fixed obligations would flatten the chart.
  const FIXED: CategoryId[] = ["rent", "emi", "insurance", "utilities"];
  for (const t of debits) if (!FIXED.includes(t.category)) daily.set(t.date, (daily.get(t.date) ?? 0) + t.amount);
  const dailySpend = Array.from({ length: daysInMonth }, (_, i) => {
    const date = `${m}-${String(i + 1).padStart(2, "0")}`;
    return { date, amount: daily.get(date) ?? 0 };
  });

  const monthlyExpenses = spending || 1;
  return {
    month: m,
    income,
    spending,
    savings: income - spending,
    savingsRate: income ? (income - spending) / income : 0,
    emergencyFundMonths: db.profile.emergencyFund.current / monthlyExpenses,
    byCategory,
    budgetPace,
    dailySpend,
    recentTransactions: [...inMonth].reverse().slice(0, 8),
    upcomingRecurring: [...db.recurring]
      .filter((r) => r.status !== "cancelled")
      .sort((a, b) => a.nextExpectedDate.localeCompare(b.nextExpectedDate))
      .slice(0, 6),
    nudges: db.nudges.filter((n) => !n.dismissed),
    goals: db.profile.goals,
  };
}
