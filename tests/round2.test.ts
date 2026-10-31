import assert from "node:assert/strict";
import { serverTest } from "../scripts/server-test";
serverTest("tests/round2.test.ts", async () => {
  const { buildSeed } = await import("../src/lib/seed"),
    { resetDb, updateDb } = await import("../src/lib/db");
  const { solvePlan } = await import("../src/lib/simulate/solve"),
    { parseScenario } = await import("../src/lib/simulate/parse"),
    { simulate } = await import("../src/lib/simulate");
  const { computeNudges, generateNudges } =
    await import("../src/lib/insights/nudges");
  const { checkLimit } = await import("../src/lib/rate-limit");
  const { protectTransaction } = await import("../src/lib/ingest/privacy");
  const { createSession, validSession, checkPasscode } =
    await import("../src/lib/auth");
  const db = buildSeed();
  await updateDb((current) => Object.assign(current, db));
  const start = performance.now(),
    plan = solvePlan(db.profile, db.transactions, db.recurring);
  assert(plan.feasible);
  assert(plan.result.goals.every((g) => g.onTrackScenario));
  assert(performance.now() - start < 1500);
  assert(
    plan.changes.every((c) => c.category !== "groceries" || c.value >= -15),
  );
  const impossible = structuredClone(db.profile);
  impossible.goals[0].targetAmount = 1e8;
  assert(!solvePlan(impossible, db.transactions, db.recurring).feasible);
  assert(
    solvePlan(db.profile, db.transactions, db.recurring, "goal-goa").feasible,
  );
  const oldProfile = JSON.stringify(db.profile);
  solvePlan(db.profile, db.transactions, db.recurring);
  assert.equal(JSON.stringify(db.profile), oldProfile);
  const base = db.transactions[0];
  assert.equal(
    protectTransaction({ ...base, account: "123456789012" }).account,
    "XXXX9012",
  );
  const outliers = structuredClone(db);
  outliers.nudges = [];
  outliers.transactions = [
    {
      ...base,
      id: "a",
      date: "2026-08-10",
      merchant: "Toit",
      category: "dining",
      amount: 1000,
      direction: "debit",
    },
    {
      ...base,
      id: "b",
      date: "2026-09-10",
      merchant: "Toit",
      category: "dining",
      amount: 1000,
      direction: "debit",
    },
    {
      ...base,
      id: "normal",
      date: "2026-10-10",
      merchant: "Toit",
      category: "dining",
      amount: 1100,
      direction: "debit",
    },
    {
      ...base,
      id: "outlier",
      date: "2026-10-11",
      merchant: "Toit",
      category: "dining",
      amount: 4000,
      direction: "debit",
    },
  ];
  const unusual = computeNudges(outliers).filter((n) => n.type === "unusual");
  assert.equal(unusual.length, 1);
  assert.equal(unusual[0].relatedTransactionId, "outlier");
  outliers.transactions.push(
    ...[1, 2, 3].map((i) => ({
      ...base,
      id: "big" + i,
      date: "2026-10-12",
      merchant: "Toit",
      category: "dining" as const,
      amount: 5000 + i,
      direction: "debit" as const,
    })),
  );
  assert.equal(
    computeNudges(outliers).filter((n) => n.type === "unusual").length,
    2,
  );
  await updateDb((current) => Object.assign(current, outliers));
  assert.equal(
    (await generateNudges()).filter((n) => n.type === "unusual").length,
    2,
  );
  await updateDb((current) => {
    for (const n of current.nudges)
      if (n.type === "unusual") n.dismissed = true;
  });
  assert.equal(
    (await generateNudges()).filter((n) => n.type === "unusual").length,
    0,
  );
  await updateDb((current) => Object.assign(current, buildSeed()));
  const cases: [string, string, string | undefined, number][] = [
    ["khana bahar 30% kam karu toh?", "category_pct", "dining", -30],
    ["rent 3 hazaar badh gaya", "fixed_cost_abs", undefined, 3000],
    ["salary 1.2 lakh ho gayi", "income_abs", undefined, 25000],
    ["shopping aadhi kar du", "category_pct", "shopping", -50],
    ["₹50k ka phone le lu next month", "one_time", undefined, 50000],
  ];
  for (const [text, kind, cat, value] of cases) {
    const r = await parseScenario(text),
      change = r.changes[0];
    assert(change, text);
    assert.equal(change.kind, kind, text);
    if (cat) assert.equal(change.category, cat, text);
    assert.equal(change.value, value, text);
    if (kind === "one_time") assert.equal(change.startMonth, 1);
    if (kind === "income_abs")
      assert.equal(
        simulate(db.profile, db.transactions, r).projected[0].income,
        120000,
      );
  }
  assert(checkLimit("unit", 2, 1000, 0).allowed);
  assert(checkLimit("unit", 2, 1000, 100).allowed);
  assert(!checkLimit("unit", 2, 1000, 200).allowed);
  assert(checkLimit("unit", 2, 1000, 1100).allowed);
  process.env.KOSH_PASSCODE = "unit-test-only";
  assert(checkPasscode("unit-test-only"));
  assert(!checkPasscode("wrong"));
  const token = createSession(1000);
  assert(validSession(token, 1000));
  assert(!validSession(token + "x", 1000));
  assert(!validSession(token, 1000 + 8 * 86400000));
  delete process.env.KOSH_PASSCODE;
  await resetDb();
  console.log(
    "PASS round2: feasible seed, caps, infeasible targets, unusual alerts, all five Hinglish phrases, session tamper/expiry, sliding windows.",
  );
});
