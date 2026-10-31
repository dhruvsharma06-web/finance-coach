import assert from "node:assert/strict";
import { serverTest } from "./server-test";
serverTest("scripts/test-engine.ts", async () => {
  const { resetDb, readDb, updateDb } = await import("../src/lib/db");
  const { detectRecurring } = await import("../src/lib/recurring");
  const { ingest } = await import("../src/lib/ingest");
  const { categorizeSync, matchRule } = await import("../src/lib/categorize");
  const { parseQuickAdd } = await import("../src/lib/ingest/quick-add");
  await resetDb();
  const recurring = await detectRecurring();
  const netflix = recurring.find((r) => r.merchant === "Netflix")!;
  assert.equal(netflix.status, "price_changed");
  assert.equal(netflix.priceChange?.from, 499);
  assert.equal(netflix.priceChange?.to, 649);
  const hotstar = recurring.find((r) => r.merchant === "Disney+ Hotstar")!;
  assert.equal(hotstar.status, "possibly_unused");
  for (const cat of ["rent", "emi", "investments"])
    assert.equal(
      recurring.find((r) => r.category === cat)?.isSubscription,
      false,
    );
  await updateDb((db) => {
    db.recurring.find((r) => r.id === hotstar.id)!.userConfirmedInUse = true;
    db.recurring.find((r) => r.id === netflix.id)!.status = "cancelled";
  });
  const again = await detectRecurring();
  assert.equal(again.find((r) => r.id === hotstar.id)?.status, "active");
  assert.equal(again.find((r) => r.id === netflix.id)?.status, "cancelled");
  const db = await readDb();
  assert(
    db.transactions.find((t) => t.id === hotstar.transactionIds[0])
      ?.recurringId === hotstar.id,
  );
  const debit = {
    merchant: "Ramesh Kumar",
    description: "UPI RAMESH KUMAR",
    amount: 1500,
    direction: "debit" as const,
  };
  assert.equal(categorizeSync(debit, []).category, "transfers");
  const base = {
    id: "b",
    pattern: "swiggy",
    matchType: "contains" as const,
    category: "dining" as const,
    createdFrom: "manual" as const,
    createdAt: "2026-10-31",
    hits: 0,
  };
  const exact = {
    ...base,
    id: "e",
    pattern: "swiggy instamart",
    matchType: "merchant_exact" as const,
    category: "groceries" as const,
  };
  assert.equal(
    matchRule({ ...debit, merchant: "Swiggy Instamart" }, [base, exact])?.id,
    "e",
  );
  assert.equal(
    (await parseQuickAdd("spent 450 on swiggy yesterday"))?.merchant,
    "Swiggy",
  );
  const rows = Array.from({ length: 500 }, (_, i) => ({
    date: "2026-11-20",
    description: "UPI SWIGGY ref " + i,
    amount: i + 1,
    direction: "debit" as const,
  }));
  const start = performance.now();
  const result = await ingest(
    [...rows, rows[0], { ...rows[0], date: "2026-02-31" }],
    "csv",
  );
  const elapsed = performance.now() - start;
  assert.equal(result.added, 500);
  assert.equal(result.duplicates, 1);
  assert(result.warnings.some((w) => w.includes("invalid")));
  console.log("500 rows: " + elapsed.toFixed(0) + "ms");
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.OPENAI_API_KEY)
    assert(elapsed < 1000, "500-row no-AI import must finish under 1 second");
  const parallel = await Promise.all([
    ingest([{ ...rows[0], description: "concurrent import" }], "csv"),
    ingest([{ ...rows[0], description: "concurrent import" }], "csv"),
  ]);
  assert.equal(
    parallel.reduce((n, r) => n + r.added, 0),
    1,
  );
  await resetDb();
  console.log(
    "Engine passed: seed recurring, preserved answers/ids, rule precedence, voice, validation, 500 rows, concurrent dedupe.",
  );
});
