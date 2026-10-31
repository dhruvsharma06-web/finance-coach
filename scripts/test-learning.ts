import { serverTest } from "./server-test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function main() {
  const { readDb, resetDb } = await import("../src/lib/db");
  const { applyCorrection, similarPreview } =
    await import("../src/lib/categorize/learn");
  const { importFile } = await import("../src/lib/ingest");
  await resetDb();
  const initial = await readDb(),
    eatclub = initial.transactions.find(
      (t) => t.merchant === "EatClub Brands",
    )!;
  assert(eatclub);
  assert.equal((await similarPreview(eatclub.id)).count, 5);
  const correction = await applyCorrection(eatclub.id, "dining");
  assert.equal(correction.appliedCount, 5);
  assert.equal(correction.rule?.matchType, "contains");
  const file = {
    name: "hdfc-november.csv",
    type: "text/csv",
    buffer: await readFile("samples/hdfc-november.csv"),
  };
  const result = await importFile(file),
    row = result.transactions.find((t) => t.merchant === "EatClub Brands")!;
  assert.equal(row.category, "dining");
  assert.equal(row.categorySource, "user_rule");
  assert.equal((await importFile(file)).added, 0);
  const repeat = await applyCorrection(eatclub.id, "dining");
  assert.equal((await readDb()).rules.length, 1);
  assert.equal(repeat.appliedCount, 0);
  console.log(
    "Learning passed: preview 5, appliedCount 5, future import dining/user_rule, re-import 0, one rule.",
  );
}
serverTest("scripts/test-learning.ts", main);
