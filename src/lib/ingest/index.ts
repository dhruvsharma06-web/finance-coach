import type { ImportResult, Transaction, TxnSource } from "../types";
import { newId, readDb, updateDb } from "../db";
import { categorizeBatch } from "../categorize";
import { detectRecurring } from "../recurring";
import { generateNudges } from "../insights/nudges";
import { parseCsv, toIsoDate } from "./csv";
import { parsePdf } from "./pdf";
import { parseSms } from "./sms";
import { cleanMerchant } from "./merchant";
import { parserWarnings } from "./warnings";
export interface RawTxn {
  date: string;
  description: string;
  merchant?: string;
  amount: number;
  direction: "debit" | "credit";
  mode?: Transaction["mode"];
  account?: string;
  balanceAfter?: number;
}
export async function importFile(file: {
  name: string;
  type: string;
  buffer: Buffer;
}): Promise<ImportResult> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv") || file.type.includes("csv"))
    return ingest(
      await parseCsv(file.buffer.toString("utf8")),
      "csv",
      file.name,
    );
  if (lower.endsWith(".pdf") || file.type.includes("pdf"))
    return ingest(await parsePdf(file.buffer), "pdf", file.name);
  if (lower.endsWith(".txt"))
    return ingest(
      await parseSms(file.buffer.toString("utf8")),
      "sms",
      file.name,
    );
  throw new Error(
    "Unsupported file type. Upload a CSV or PDF, or paste SMS text.",
  );
}
export async function importSms(text: string): Promise<ImportResult> {
  return ingest(await parseSms(text), "sms");
}
export function deriveMerchant(description: string): string {
  return cleanMerchant(description);
}
export async function ingest(
  raw: RawTxn[],
  source: TxnSource,
  fileName?: string,
): Promise<ImportResult> {
  const importId = newId(),
    db = await readDb(),
    warnings = [...parserWarnings(raw)];
  const valid = raw.filter(
    (r) =>
      typeof r.date === "string" &&
      !!toIsoDate(r.date) &&
      typeof r.description === "string" &&
      !!r.description.trim() &&
      Number.isFinite(r.amount) &&
      r.amount > 0 &&
      (r.direction === "debit" || r.direction === "credit"),
  );
  if (valid.length < raw.length)
    warnings.push(
      "Dropped " + (raw.length - valid.length) + " invalid transaction rows.",
    );
  const key = (t: RawTxn) =>
    t.date +
    "|" +
    t.direction +
    "|" +
    t.amount.toFixed(2) +
    "|" +
    t.description.toLowerCase().replace(/\s+/g, " ").trim();
  const seen = new Set(db.transactions.map(key)),
    fresh: RawTxn[] = [];
  let duplicates = 0;
  for (const r of valid) {
    const row = { ...r, date: toIsoDate(r.date) };
    const k = key(row);
    if (seen.has(k)) {
      duplicates++;
      continue;
    }
    seen.add(k);
    fresh.push(row);
  }
  const withMerchant = fresh.map((r) => ({
    ...r,
    merchant: r.merchant
      ? cleanMerchant(r.merchant)
      : deriveMerchant(r.description),
  }));
  const cats = await categorizeBatch(withMerchant, db.rules);
  let txns: Transaction[] = withMerchant.map((r, i) => ({
    ...r,
    id: newId(),
    source,
    importId,
    ...cats[i],
  }));
  await updateDb((d) => {
    // Recheck under the write lock: simultaneous imports cannot insert duplicates.
    const current = new Set(d.transactions.map(key));
    txns = txns.filter((t) => {
      const k = key(t);
      if (current.has(k)) {
        duplicates++;
        return false;
      }
      current.add(k);
      return true;
    });
    for (const t of txns)
      if (t.ruleId) {
        const rule = d.rules.find((r) => r.id === t.ruleId);
        if (rule) rule.hits++;
      }
    d.transactions.push(...txns);
    d.transactions.sort((a, b) => a.date.localeCompare(b.date));
  });
  if (!raw.length) warnings.push("No transactions found in this input.");
  try {
    await detectRecurring();
  } catch {
    warnings.push("Recurring detection could not be refreshed.");
  }
  let newNudges: ImportResult["newNudges"] = [];
  try {
    newNudges = await generateNudges();
  } catch {
    warnings.push("Nudges could not be refreshed.");
  }
  return {
    importId,
    source,
    fileName,
    parsed: raw.length,
    added: txns.length,
    duplicates,
    transactions: txns,
    warnings,
    newNudges,
  };
}
