import { serverTest } from "./server-test";
// server-only modules are loaded using the React server export condition.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

async function main() {
  const { parseCsv, toIsoDate } = await import("../src/lib/ingest/csv");
  const { parseSms } = await import("../src/lib/ingest/sms");
  const { parsePdf } = await import("../src/lib/ingest/pdf");
  const { cleanMerchant } = await import("../src/lib/ingest/merchant");
  for (const file of await readdir("samples")) {
    const b = await readFile("samples/" + file);
    const rows = file.endsWith(".csv")
      ? await parseCsv(b.toString())
      : file.endsWith(".pdf")
        ? await parsePdf(b)
        : file.endsWith(".txt")
          ? await parseSms(b.toString())
          : null;
    if (!rows) continue;
    assert(rows.length > 0, file + " must parse");
    const expected: Record<string, number> = {
      "hdfc-november.csv": 10,
      "icici-style.csv": 3,
      "sbi-style.csv": 3,
      "sms-dump.txt": 10,
    };
    if (expected[file]) assert.equal(rows.length, expected[file]);
    if (file === "sms-dump.txt") {
      const {parserWarnings}=await import("../src/lib/ingest/warnings");
      assert(parserWarnings(rows).some(w=>w.includes("Ignored 3")));
      assert.equal(rows.find(t=>t.merchant==="Netflix")?.direction,"debit");
      assert.equal(rows.find(t=>t.merchant==="Disney+ Hotstar")?.date,"2026-11-15");
    }
    console.log(file + ": " + rows.length + " rows", rows.slice(0, 3));
  }
  assert.equal(toIsoDate("04-Nov-26"), "2026-11-04");
  assert.equal(toIsoDate("31/02/26"), "");
  for (const [input, want] of [
    ["UPI-SWIGGY-swiggy@icici-430698765432", "Swiggy"],
    ["UPI/DR/430612345678/ZOMATO LTD/YESB/zomato@kotak", "Zomato"],
    ["POS 4821XXXXXX1234 UBER INDIA", "Uber"],
    ["ACH D- BSE LTD MF SIP", "Mutual Fund SIP"],
    ["NEFT CR-ACME DESIGN LABS PVT LTD-SALARY", "Acme Design Labs (Salary)"],
    ["UPI-RAMESH KUMAR-9845XXXX12@okaxis", "Ramesh Kumar"],
    ["ATM WDL HDFC KORAMANGALA", "ATM Withdrawal"],
  ])
    assert.equal(cleanMerchant(input), want);
  console.log("Parser checks passed");
}
serverTest("scripts/test-parsers.ts", main);

