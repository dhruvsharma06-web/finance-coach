import type { FinancialProfile, ProjectionPoint, Scenario, SimulationResult, Transaction } from "../types";
import { addMonths, monthKey } from "../format";
import { isSpendCategory } from "../categories";

/**
 * LANE C (friend's Codex) owns lib/simulate/**.
 * Deterministic month-by-month projection engine. NO LLM math here.
 * - Baseline = income − (fixed costs + avg variable spend per category, last 3 full months)
 * - Apply ScenarioChange[] from startMonth onward
 * - Goals funded in priority order from cumulative savings → reach dates, monthsDelta
 * Stub: flat projection so the UI can render; goal outcomes are placeholders.
 */
export function simulate(
  profile: FinancialProfile,
  transactions: Transaction[],
  scenario: Scenario,
  horizonMonths = 12,
): SimulationResult {
  const start = monthKey(new Date());
  const months = [...new Set(transactions.map((t) => t.date.slice(0, 7)))].sort().slice(-3);
  const inWindow = transactions.filter((t) => t.direction === "debit" && months.includes(t.date.slice(0, 7)));
  const avg = (filter: (t: Transaction) => boolean) =>
    inWindow.filter(filter).reduce((s, t) => s + t.amount, 0) / Math.max(months.length, 1);
  const baseSpend = avg((t) => isSpendCategory(t.category));

  const run = (apply: boolean): ProjectionPoint[] => {
    let cum = 0;
    return Array.from({ length: horizonMonths }, (_, i) => {
      let income = profile.monthlyIncome;
      let spending = baseSpend;
      if (apply) {
        for (const c of scenario.changes) {
          const from = c.startMonth ?? 0;
          if (from > i) continue;
          if (c.kind === "category_pct" && c.category) spending += avg((t) => t.category === c.category) * (c.value / 100);
          else if (c.kind === "income_pct") income *= 1 + c.value / 100;
          else if (c.kind === "income_abs") income += c.value;
          else if (c.kind === "one_time") spending += from === i ? c.value : 0;
          else spending += c.value;
        }
      }
      const savings = income - spending;
      cum += savings;
      return {
        month: addMonths(start, i),
        income: Math.round(income),
        spending: Math.round(spending),
        savings: Math.round(savings),
        cumulativeSavings: Math.round(cum),
      };
    });
  };

  const baseline = run(false);
  const projected = run(true);
  return {
    scenario,
    horizonMonths,
    baseline,
    projected,
    goals: profile.goals.map((g) => ({
      goalId: g.id,
      name: g.name,
      targetDate: g.targetDate,
      baselineReachDate: null,
      scenarioReachDate: null,
      onTrackBaseline: false,
      onTrackScenario: false,
      monthsDelta: null,
    })),
    monthlySavingsDelta: projected[horizonMonths - 1].savings - baseline[horizonMonths - 1].savings,
    summary: "Projection stub — Lane C replaces this with real goal timing and a written summary.",
    assumptions: ["Variable spend = average of the last 3 months", "No investment returns assumed"],
  };
}
