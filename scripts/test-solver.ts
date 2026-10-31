import { serverTest } from "./server-test";
import assert from "node:assert/strict";
serverTest("scripts/test-solver.ts", async () => {
  const { buildSeed } = await import("../src/lib/seed");
  const { solvePlan } = await import("../src/lib/simulate/solve");
  const db = buildSeed(),
    start = performance.now(),
    r = solvePlan(db.profile, db.transactions, db.recurring);
  console.log(
    JSON.stringify(
      {
        changes: r.changes,
        goals: r.result.goals,
        ms: performance.now() - start,
        feasible: r.feasible,
      },
      null,
      2,
    ),
  );
  assert(r.feasible);
  assert(r.result.goals.every((g) => g.onTrackScenario));
  assert(performance.now() - start < 1500);
});
