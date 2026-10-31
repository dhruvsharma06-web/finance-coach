import "server-only";
import type { FinancialProfile, Scenario, SimulationResult, Transaction } from "../types";
import { aiAvailable, aiText, COACH_GUARDRAILS } from "../ai";
import { simulate } from "./index";

/** simulate() + an AI-written summary that only restates the computed numbers. Falls back to the template. */
export async function simulateWithSummary(
  profile: FinancialProfile,
  transactions: Transaction[],
  scenario: Scenario,
  horizonMonths = 12,
): Promise<SimulationResult> {
  const r = simulate(profile, transactions, scenario, horizonMonths);
  if (!aiAvailable() || !scenario.changes.length) return r;
  try {
    const facts = {
      scenario: r.scenario,
      monthlySavingsDelta: r.monthlySavingsDelta,
      savingsAfter12Months: { baseline: r.baseline.at(-1)?.cumulativeSavings, scenario: r.projected.at(-1)?.cumulativeSavings },
      goals: r.goals,
      templateSummary: r.summary,
    };
    const text = await aiText({
      system: `${COACH_GUARDRAILS}
You explain a what-if projection to ${profile.name}. Use ONLY the numbers in the JSON. Never compute new numbers or dates.
2–3 short sentences, second person, concrete, ₹ amounts as given. Mention the goal that moves most. No preamble.`,
      prompt: JSON.stringify(facts),
    });
    return { ...r, summary: text.trim() || r.summary };
  } catch {
    return r;
  }
}
