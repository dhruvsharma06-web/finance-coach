import { readDb } from "@/lib/db";
import { simulateWithSummary } from "@/lib/simulate/summary";
import { parseScenario, ScenarioParseError } from "@/lib/simulate/parse";
import { fail, handle, ok } from "@/lib/api";
import type { Scenario } from "@/lib/types";

export const maxDuration = 60;

/**
 * POST /api/simulate  { prompt?: string, scenario?: Scenario, horizonMonths?: number }
 * → SimulationResult. Send `prompt` for natural language, or `scenario` from the slider UI.
 * A prompt that can't be understood returns 422 { error, suggestions }.
 */
export const POST = handle(async (req: Request) => {
  const body = await req.json();
  let scenario: Scenario | undefined = body.scenario;
  if (!scenario && body.prompt) {
    scenario = await parseScenario(String(body.prompt));
    if (!scenario.changes.length) {
      const e = new ScenarioParseError("I couldn't turn that into numbers yet.");
      return Response.json({ error: e.message, suggestions: e.suggestions }, { status: 422 });
    }
  }
  if (!scenario) return fail("Send a prompt or a scenario");
  const db = await readDb();
  return ok(await simulateWithSummary(db.profile, db.transactions, scenario, body.horizonMonths ?? 12));
});
