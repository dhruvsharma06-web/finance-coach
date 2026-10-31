import { readDb } from "@/lib/db";
import { simulate } from "@/lib/simulate";
import { parseScenario } from "@/lib/simulate/parse";
import { fail, handle, ok } from "@/lib/api";
import type { Scenario } from "@/lib/types";


/**
 * POST /api/simulate  { prompt?: string, scenario?: Scenario, horizonMonths?: number }
 * → SimulationResult. Send `prompt` for natural language, or `scenario` from the slider UI.
 */
export const POST = handle(async (req: Request) => {
  const body = await req.json();
  let scenario: Scenario | undefined = body.scenario;
  if (!scenario && body.prompt) scenario = await parseScenario(String(body.prompt));
  if (!scenario) return fail("Send a prompt or a scenario");
  const db = await readDb();
  return ok(simulate(db.profile, db.transactions, scenario, body.horizonMonths ?? 12));
});
