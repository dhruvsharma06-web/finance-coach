import type {
  CategoryId,
  FinancialProfile,
  Transaction,
  RecurringPayment,
  ScenarioChange,
  SimulationResult,
} from "../types";
import { simulate, buildBaseline } from "./index";
import { getCategory } from "../categories";
import { formatINR } from "../format";
import { aiAvailable, aiText, COACH_GUARDRAILS } from "../ai";
export interface PlanFix {
  changes: ScenarioChange[];
  result: SimulationResult;
  explanation: string;
  feasible: boolean;
}
const weights: Partial<Record<CategoryId, number>> = {
  dining: 1,
  shopping: 1,
  entertainment: 1,
  travel: 1,
  subscriptions: 0.8,
  transport: 1.5,
  groceries: 2,
};
const monthNumber = (s: string) => {
  const [y, m] = s.slice(0, 7).split("-").map(Number);
  return y * 12 + m;
};
export function solvePlan(
  profile: FinancialProfile,
  txns: Transaction[],
  recurring: RecurringPayment[] = [],
  goalId?: string,
): PlanFix {
  if (goalId && !profile.goals.some((g) => g.id === goalId))
    throw new Error("Goal not found");
  const b = buildBaseline(profile, txns),
    cats = (Object.keys(weights) as CategoryId[]).filter(
      (c) => (b.variableByCategory[c] ?? 0) > 0,
    );
  const targets = profile.goals.filter((g) => !goalId || g.id === goalId);
  const selected = (r: SimulationResult) =>
    r.goals.filter((g) => targets.some((t) => t.id === g.goalId));
  const feasible = (r: SimulationResult) =>
    selected(r).every((g) => g.onTrackScenario);
  const debt = (r: SimulationResult) =>
    selected(r).reduce(
      (n, g) =>
        n +
        Math.max(
          0,
          (g.scenarioReachDate
            ? monthNumber(g.scenarioReachDate)
            : monthNumber(b.startMonth) + 36) - monthNumber(g.targetDate),
        ),
      0,
    );
  const saved: Partial<Record<CategoryId, number>> = {},
    cancelled = new Set<string>();
  let subCancel = 0;
  const cap = (c: CategoryId) =>
    (b.variableByCategory[c] ?? 0) * (c === "groceries" ? 0.15 : 0.4);
  const changesFor = (
    amounts: Partial<Record<CategoryId, number>>,
    cancel: number,
  ): ScenarioChange[] =>
    cats
      .filter((c) => (amounts[c] ?? 0) > 0)
      .map((c) =>
        c === "subscriptions" && cancel > 0
          ? { kind: "category_abs", category: c, value: -(amounts[c] ?? 0) }
          : {
              kind: "category_pct",
              category: c,
              value: -Math.round(
                ((amounts[c] ?? 0) / (b.variableByCategory[c] ?? 1)) * 100,
              ),
            },
      );
  let changes: ScenarioChange[] = [],
    result = simulate(profile, txns, { name: "Fix my plan", changes });
  let calls = 1;
  const unused = recurring
    .filter((r) => r.isSubscription && r.status === "possibly_unused")
    .map((r) => ({
      ...r,
      monthly:
        r.lastAmount *
        { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 }[
          r.cadence
        ],
    }));
  while (!feasible(result) && calls < 399) {
    const candidates: { cat: CategoryId; amount: number; cancelId?: string }[] =
      cats
        .filter((c) => (saved[c] ?? 0) + 0.01 < cap(c))
        .map((c) => ({
          cat: c,
          amount: Math.min(
            (b.variableByCategory[c] ?? 0) * 0.05,
            cap(c) - (saved[c] ?? 0),
          ),
        }));
    for (const r of unused)
      if (
        !cancelled.has(r.id) &&
        r.monthly > 0 &&
        (saved.subscriptions ?? 0) + r.monthly <= cap("subscriptions") + 0.01
      )
        candidates.push({
          cat: "subscriptions",
          amount: r.monthly,
          cancelId: r.id,
        });
    let best:
      | {
          candidate: (typeof candidates)[number];
          result: SimulationResult;
          changes: ScenarioChange[];
          score: number;
          cost: number;
        }
      | undefined;
    const currentDebt = debt(result);
    for (const candidate of candidates) {
      if (calls >= 399) break;
      const next = {
          ...saved,
          [candidate.cat]: (saved[candidate.cat] ?? 0) + candidate.amount,
        },
        change = changesFor(
          next,
          subCancel + (candidate.cancelId ? candidate.amount : 0),
        );
      const trial = simulate(profile, txns, {
        name: "Fix my plan",
        changes: change,
      });
      calls++;
      const cost = candidate.amount * (weights[candidate.cat] ?? 1),
        gain = Math.max(0, currentDebt - debt(trial)),
        score = gain / Math.max(cost, 0.01);
      if (
        !best ||
        score > best.score ||
        (score === best.score &&
          ((feasible(trial) && !feasible(best.result)) || cost < best.cost))
      )
        best = { candidate, result: trial, changes: change, score, cost };
    }
    if (!best) break;
    saved[best.candidate.cat] =
      (saved[best.candidate.cat] ?? 0) + best.candidate.amount;
    if (best.candidate.cancelId) {
      cancelled.add(best.candidate.cancelId);
      subCancel += best.candidate.amount;
    }
    changes = best.changes;
    result = best.result;
  }
  // Remove unnecessary steps once the greedy path becomes feasible.
  if (feasible(result))
    for (const cat of [...cats].reverse()) {
      if (cat === "subscriptions" && subCancel) continue;
      while ((saved[cat] ?? 0) > 0 && calls < 399) {
        const next = {
            ...saved,
            [cat]: Math.max(
              0,
              (saved[cat] ?? 0) - (b.variableByCategory[cat] ?? 0) * 0.05,
            ),
          },
          trialChanges = changesFor(next, subCancel);
        const trial = simulate(profile, txns, {
          name: "Fix my plan",
          changes: trialChanges,
        });
        calls++;
        if (!feasible(trial)) break;
        saved[cat] = next[cat];
        changes = trialChanges;
        result = trial;
      }
    }
  const ok = feasible(result),
    summary = changes
      .map((c) =>
        c.kind === "category_pct"
          ? "trim " +
            getCategory(c.category!).label.toLowerCase() +
            " by " +
            Math.abs(c.value) +
            "%"
          : "reduce subscriptions by " + formatINR(-c.value) + "/month",
      )
      .join(" and ");
  const explanation = !targets.length
    ? "Add a goal and target date to build a plan."
    : !changes.length && ok
      ? "Your current plan already puts " +
        (goalId ? "this goal" : "every goal") +
        " on track."
      : (summary
          ? summary[0].toUpperCase() +
            summary.slice(1) +
            ", freeing about " +
            formatINR(result.monthlySavingsDelta) +
            " a month. "
          : "") +
        (ok
          ? (goalId ? "This goal" : "Every goal") +
            " is on track within these projections."
          : "These realistic cuts still leave a gap. Consider a later target date or more income; investment returns are not assumed.");
  return { changes, result, explanation, feasible: ok };
}
export async function fixPlan(
  profile: FinancialProfile,
  txns: Transaction[],
  recurring: RecurringPayment[] = [],
  goalId?: string,
): Promise<PlanFix> {
  const plan = solvePlan(profile, txns, recurring, goalId);
  if (aiAvailable())
    try {
      const text = await aiText({
        system:
          COACH_GUARDRAILS +
          "\nRewrite this computed plan in 2-3 sentences. Use only these numbers, dates and feasibility; never compute or promise new outcomes.",
        prompt: JSON.stringify(plan),
      });
      if (text.trim()) plan.explanation = text.trim();
    } catch {
      /* deterministic explanation remains */
    }
  return plan;
}
