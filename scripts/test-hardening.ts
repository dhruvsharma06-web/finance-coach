import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { serverTest } from "./server-test";
serverTest("scripts/test-hardening.ts", async () => {
  const { parseQuickAdd } = await import("../src/lib/ingest/quick-add");
  const { todayIST } = await import("../src/lib/ingest/sms");
  const { cleanMerchant } = await import("../src/lib/ingest/merchant");
  const { parseCsv } = await import("../src/lib/ingest/csv");
  const { parsePdfText } = await import("../src/lib/ingest/pdf");
  const { parserWarnings } = await import("../src/lib/ingest/warnings");
  const { resetDb, readDb, updateDb, newId } = await import("../src/lib/db");
  const { previewFile, ingest } = await import("../src/lib/ingest");
  const { applyCorrection, similarPreview } =
    await import("../src/lib/categorize/learn");
  const { detectRecurring } = await import("../src/lib/recurring");
  for (const input of [
    "I haven't paid 450 on swiggy",
    "I will have spent 450 on swiggy tomorrow",
    "paid 450 on Swiggy tomorrow",
    "paid 450 at Swiggy and paid 300 at Uber",
    "paid 450 at Swiggy and 300 at Uber",
    "spent 450 on swiggy on 31/02/2026",
  ])
    assert.equal(await parseQuickAdd(input), null, input);
  const yesterday = new Date(todayIST() + "T00:00:00Z");
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  assert.equal(
    (await parseQuickAdd("I spent INR 450 at Swiggy YESTERDAY"))?.date,
    yesterday.toISOString().slice(0, 10),
  );
  assert.equal(
    (await parseQuickAdd("paid 500 for rent on 30/10/2026"))?.date,
    "2026-10-30",
  );
  assert.equal(
    cleanMerchant("UPI/ramesh.kumar@okaxis/430799998888"),
    "Ramesh Kumar",
  );
  const ambiguous = await parseCsv(
    "Date,Description,Debit,Credit\n10/10/2026,Ambiguous,100,200",
  );
  assert.equal(ambiguous.length, 0);
  assert.equal(
    (
      await parseCsv("Date,Description,Amount,Dr/Cr\n10/10/2026,Refund,-500,Cr")
    )[0].direction,
    "credit",
  );
  assert(parserWarnings(ambiguous).some((w) => w.includes("Dropped 1")));
  const pdfRows = parsePdfText(
    "2026-10-30 Coffee 450.00 Dr 5000.00\n31-Oct-26 Salary 95000.00 Cr",
  );
  assert.equal(pdfRows.length, 2);
  assert.equal(pdfRows[1].direction, "credit");
  await resetDb();
  const before = await readDb();
  const preview = await previewFile({
    name: "hdfc-november.csv",
    type: "text/csv",
    buffer: await readFile("samples/hdfc-november.csv"),
  });
  assert.equal(preview.wouldAdd, 10);
  assert(preview.needsReview >= 2);
  assert.deepEqual(await readDb(), before);
  const base = before.transactions[0],
    specialId = newId(),
    swiggyId = newId();
  await updateDb((db) => {
    db.transactions.push(
      {
        ...base,
        id: specialId,
        merchant: "Swiggy Instamart",
        description: "UPI INSTAMART",
        direction: "debit",
        category: "groceries",
        categorySource: "user_rule",
      },
      {
        ...base,
        id: swiggyId,
        merchant: "Swiggy",
        description: "UPI SWIGGY",
        direction: "debit",
        category: "dining",
        categorySource: "builtin",
      },
    );
    db.rules.push({
      id: newId(),
      pattern: "swiggy instamart",
      matchType: "merchant_exact",
      category: "groceries",
      direction: "debit",
      createdFrom: "manual",
      createdAt: new Date().toISOString(),
      hits: 0,
    });
  });
  assert(!(await similarPreview(swiggyId)).similarIds.includes(specialId));
  const fix = await applyCorrection(swiggyId, "shopping");
  assert(!fix.similarIds.includes(specialId));
  assert.equal(
    (await readDb()).transactions.find((t) => t.id === specialId)?.category,
    "groceries",
  );
  await resetDb();
  await detectRecurring();
  await ingest(
    [
      {
        date: "2026-11-12",
        description: "NETFLIX NOV",
        merchant: "Netflix",
        amount: 649,
        direction: "debit",
      },
    ],
    "csv",
  );
  assert.equal(
    (await readDb()).recurring.find((r) => r.merchant === "Netflix")
      ?.priceChange?.from,
    499,
  );
  await updateDb((db) => {
    const base = db.transactions[0];
    for (const date of ["2026-08-10", "2026-09-10", "2026-10-10"])
      db.transactions.push({
        ...base,
        id: newId(),
        date,
        merchant: "Test Pharmacy",
        description: "Monthly prescription",
        amount: 500,
        direction: "debit",
        category: "health",
      });
    const hotstar = db.recurring.find((r) => r.merchant === "Disney+ Hotstar")!;
    hotstar.userConfirmedInUse = false;
  });
  const rec = await detectRecurring();
  assert.equal(
    rec.find((r) => r.merchant === "Test Pharmacy")?.isSubscription,
    false,
  );
  assert.equal(
    rec.find((r) => r.merchant === "Disney+ Hotstar")?.status,
    "possibly_unused",
  );
  await resetDb();
  console.log(
    "Hardening passed: no phantom voice payments, Indian dates, VPA payees, ambiguous CSV rows, PDF dates, read-only preview, rule precedence, persistent price changes, pharmacy exclusions.",
  );
});
