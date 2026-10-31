import type {
  FinancialProfile,
  GoalOutcome,
  ProjectionPoint,
  Scenario,
  ScenarioChange,
  SimulationResult,
  Transaction,
} from "../types";
import { addMonths, formatINR } from "../format";
import { getCategory } from "../categories";
import { buildBaseline, FIXED_CATEGORIES, type Baseline } from "./baseline";

/**
 * Deterministic month-by-month projection engine. NO LLM math here.
 *
 * Each month: income − essentials − SIP − variable spend (after scenario changes) = cash surplus.
 * Surplus funds goals: first each unfinished goal gets the monthly pace it needs to hit its date
 * (earliest deadline first), then anything left goes to goals in priority order.
 */

const GOAL_HORIZON = 36;
const PRIORITY = { high: 0, medium: 1, low: 2 } as const;

const clamp = (c: ScenarioChange): ScenarioChange => {
  const pct = c.kind === "category_pct" || c.kind === "income_pct";
  return {
    ...c,
    value: pct ? Math.max(-100, Math.min(300, c.value)) : Math.max(-1e8, Math.min(1e8, c.value)),
    startMonth: Math.max(0, Math.min(GOAL_HORIZON - 1, Math.round(c.startMonth ?? 0))),
  };
};

function monthFlow(b: Baseline, changes: ScenarioChange[], i: number) {
  let income = b.monthlyIncome;
  let essentials = b.fixedEssentials;
  const variable = { ...b.variableByCategory };
  let extra = 0;
  for (const c of changes) {
    const from = c.startMonth ?? 0;
    if (from > i) continue;
    switch (c.kind) {
      case "category_pct":
        if (c.category && FIXED_CATEGORIES.includes(c.category)) essentials *= 1 + c.value / 100;
        else if (c.category) variable[c.category] = (variable[c.category] ?? 0) * (1 + c.value / 100);
        break;
      case "category_abs":
        if (c.category) variable[c.category] = Math.max(0, (variable[c.category] ?? 0) + c.value);
        break;
      case "income_pct":
        income *= 1 + c.value / 100;
        break;
      case "income_abs":
        income += c.value;
        break;
      case "fixed_cost_abs":
        essentials += c.value;
        break;
      case "one_time":
        if (from === i) extra += c.value;
        break;
      case "new_recurring":
        extra += c.value;
        break;
    }
  }
  const variableTotal = Object.values(variable).reduce((s, v) => s + (v ?? 0), 0);
  const spending = essentials + variableTotal + extra;
  const surplus = income - spending - b.investing;
  return { income, spending, surplus };
}

function project(profile: FinancialProfile, b: Baseline, changes: ScenarioChange[], months: number) {
  const points: ProjectionPoint[] = [];
  const goals = [...profile.goals].map((g) => ({ ...g, saved: g.currentAmount, reached: g.currentAmount >= g.targetAmount ? addMonths(b.startMonth, -1) : null as string | null }));
  let cum = 0;
  for (let i = 0; i < months; i++) {
    const month = addMonths(b.startMonth, i);
    const f = monthFlow(b, changes, i);
    cum += f.surplus + b.investing;
    points.push({ month, income: Math.round(f.income), spending: Math.round(f.spending), savings: Math.round(f.surplus + b.investing), cumulativeSavings: Math.round(cum) });

    // goal funding from cash surplus (SIP is already invested, not goal money)
    let pot = Math.max(0, f.surplus);
    const open = goals.filter((g) => !g.reached);
    const monthsLeft = (g: (typeof goals)[number]) => {
      const [ty, tm] = g.targetDate.slice(0, 7).split("-").map(Number);
      const [my, mm] = month.split("-").map(Number);
      return Math.max(1, (ty - my) * 12 + (tm - mm) + 1);
    };
    for (const g of [...open].sort((a, z) => a.targetDate.localeCompare(z.targetDate))) {
      const need = Math.max(0, (g.targetAmount - g.saved) / monthsLeft(g));
      const give = Math.min(pot, need);
      g.saved += give;
      pot -= give;
    }
    for (const g of [...open].sort((a, z) => PRIORITY[a.priority] - PRIORITY[z.priority] || a.targetDate.localeCompare(z.targetDate))) {
      const give = Math.min(pot, g.targetAmount - g.saved);
      g.saved += give;
      pot -= give;
    }
    for (const g of open) if (g.saved >= g.targetAmount - 1) g.reached = month;
  }
  return { points, goals };
}

const endOfMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
};
const monthDiff = (a: string, b: string) => {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
};
const shortMonth = (d: string) => new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

export function describeChange(c: ScenarioChange): string {
  const cat = c.category ? getCategory(c.category).label.toLowerCase() : "";
  switch (c.kind) {
    case "category_pct":
      return `${c.value < 0 ? "cutting" : "raising"} ${cat} by ${Math.abs(c.value)}%`;
    case "category_abs":
      return `${c.value < 0 ? "spending" : "adding"} ${formatINR(Math.abs(c.value))} ${c.value < 0 ? "less" : "more"} a month on ${cat}`;
    case "income_pct":
      return `income ${c.value < 0 ? "dropping" : "rising"} ${Math.abs(c.value)}%`;
    case "income_abs":
      return `income ${c.value < 0 ? "dropping" : "rising"} by ${formatINR(Math.abs(c.value))} a month`;
    case "fixed_cost_abs":
      return `${(c.label ?? "fixed costs").toLowerCase()} ${c.value < 0 ? "dropping" : "going up"} by ${formatINR(Math.abs(c.value))}`;
    case "one_time":
      return c.value < 0 ? `a ${formatINR(-c.value)} windfall` : `a one-off ${formatINR(c.value)} spend`;
    case "new_recurring":
      return `a new ${formatINR(c.value)}/month${c.label ? ` ${c.label}` : ""}`;
  }
}

export function templateSummary(r: Omit<SimulationResult, "summary">): string {
  if (!r.scenario.changes.length) {
    const behind = r.goals.filter((g) => !g.onTrackBaseline).map((g) => g.name);
    return behind.length
      ? `On today's plan you save about ${formatINR(r.baseline[0]?.savings ?? 0)} a month. ${behind.join(" and ")} ${behind.length > 1 ? "are" : "is"} behind schedule. Try a what-if to see what closes the gap.`
      : `On today's plan you save about ${formatINR(r.baseline[0]?.savings ?? 0)} a month and every goal is on track.`;
  }
  const what = r.scenario.changes.map(describeChange).join(" and ");
  const d = Math.round(r.monthlySavingsDelta);
  const oneOffOnly = r.scenario.changes.every((c) => c.kind === "one_time");
  const parts = [
    oneOffOnly
      ? `${what[0].toUpperCase()}${what.slice(1)} comes straight out of what you'd otherwise save.`
      : `${what[0].toUpperCase()}${what.slice(1)} ${d >= 0 ? "frees up" : "costs you"} about ${formatINR(Math.abs(d))} a month on average.`,
  ];
  const moved = r.goals.filter((g) => g.monthsDelta);
  for (const g of moved.slice(0, 2)) {
    parts.push(
      g.scenarioReachDate
        ? `${g.name} lands ${shortMonth(g.scenarioReachDate)}, ${Math.abs(g.monthsDelta!)} month${Math.abs(g.monthsDelta!) > 1 ? "s" : ""} ${g.monthsDelta! < 0 ? "sooner" : "later"}${g.onTrackScenario && !g.onTrackBaseline ? ", now on track" : ""}.`
        : `${g.name} slips beyond three years.`,
    );
  }
  const newlyOnTrack = r.goals.filter((g) => g.onTrackScenario && !g.onTrackBaseline && !g.monthsDelta);
  for (const g of newlyOnTrack.slice(0, 1)) parts.push(`${g.name} is now on track.`);
  if (moved.length === 0 && d !== 0) parts.push("Your goal dates don't move, but the extra money builds your buffer.");
  return parts.join(" ");
}

/** Pure + synchronous. Use simulateWithSummary (in ./summary) for an AI-written summary. */
export function simulate(profile: FinancialProfile, transactions: Transaction[], scenario: Scenario, horizonMonths = 12): SimulationResult {
  const horizon = Math.max(3, Math.min(36, Math.round(horizonMonths)));
  const changes = scenario.changes.map(clamp);
  const b = buildBaseline(profile, transactions);
  const base = project(profile, b, [], GOAL_HORIZON);
  const scen = project(profile, b, changes, GOAL_HORIZON);

  const goals: GoalOutcome[] = profile.goals.map((g) => {
    const bg = base.goals.find((x) => x.id === g.id)!;
    const sg = scen.goals.find((x) => x.id === g.id)!;
    const target = g.targetDate.slice(0, 7);
    return {
      goalId: g.id,
      name: g.name,
      targetDate: g.targetDate,
      baselineReachDate: bg.reached ? endOfMonth(bg.reached) : null,
      scenarioReachDate: sg.reached ? endOfMonth(sg.reached) : null,
      onTrackBaseline: !!bg.reached && bg.reached <= target,
      onTrackScenario: !!sg.reached && sg.reached <= target,
      monthsDelta: bg.reached && sg.reached ? monthDiff(bg.reached, sg.reached) : null,
    };
  });

  const avg = (p: ProjectionPoint[]) => p.slice(0, horizon).reduce((s, x) => s + x.savings, 0) / horizon;
  const partial = {
    scenario: { ...scenario, changes },
    horizonMonths: horizon,
    baseline: base.points.slice(0, horizon),
    projected: scen.points.slice(0, horizon),
    goals,
    monthlySavingsDelta: Math.round(avg(scen.points) - avg(base.points)),
    assumptions: [
      `Spending = your ${b.window.length}-month average (${b.window.map((m) => new Date(m + "-01").toLocaleDateString("en-IN", { month: "short" })).join(", ")})`,
      `${formatINR(b.investing)}/month SIP keeps running`,
      "No investment returns or inflation assumed",
      "Goals are funded from what's left each month, nearest deadline first",
    ],
  };
  return { ...partial, summary: templateSummary(partial) };
}

export { buildBaseline };
