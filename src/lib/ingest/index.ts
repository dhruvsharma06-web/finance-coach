import type { ImportResult, Transaction, TxnSource } from "../types";
import { newId, readDb, updateDb } from "../db";
import { categorizeBatch, categorizeSync } from "../categorize";
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
type ImportFile = { name: string; type: string; buffer: Buffer };
export interface ImportPreview {
  source: TxnSource;
  fileName?: string;
  parsed: number;
  wouldAdd: number;
  duplicates: number;
  needsReview: number;
  transactions: Transaction[];
  warnings: string[];
}
async function parseFile(
  file: ImportFile,
): Promise<{ raw: RawTxn[]; source: TxnSource }> {
  const lower = file.name.toLowerCase();
  if (
    lower.endsWith(".csv") ||
    (!/\.(pdf|txt)$/.test(lower) && file.type.includes("csv"))
  )
    return { raw: await parseCsv(file.buffer.toString("utf8")), source: "csv" };
  if (lower.endsWith(".pdf") || file.type.includes("pdf"))
    return { raw: await parsePdf(file.buffer), source: "pdf" };
  if (lower.endsWith(".txt"))
    return { raw: await parseSms(file.buffer.toString("utf8")), source: "sms" };
  throw new Error(
    "Unsupported file type. Upload a CSV or PDF, or paste SMS text.",
  );
}
export async function importFile(file: ImportFile): Promise<ImportResult> {
  const { raw, source } = await parseFile(file);
  return ingest(raw, source, file.name);
}
export async function importSms(text: string): Promise<ImportResult> {
  return ingest(await parseSms(text), "sms");
}
export function deriveMerchant(description: string): string {
  return cleanMerchant(description);
}
const key = (t: RawTxn) =>
  t.date +
  "|" +
  t.direction +
  "|" +
  t.amount.toFixed(2) +
  "|" +
  t.description.toLowerCase().replace(/\s+/g, " ").trim();
async function prepare(
  raw: RawTxn[],
  source: TxnSource,
  fileName?: string,
): Promise<ImportPreview> {
  const db = await readDb(),
    warnings = [...parserWarnings(raw)];
  const valid = raw.filter(
    (r) =>
      r &&
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
    merchant:
      typeof r.merchant === "string" && r.merchant.trim()
        ? cleanMerchant(r.merchant)
        : deriveMerchant(r.description),
    balanceAfter: Number.isFinite(r.balanceAfter) ? r.balanceAfter : undefined,
  }));
  const cats = await categorizeBatch(withMerchant, db.rules);
  const transactions = withMerchant.map((r, i) => ({
    ...r,
    id: newId(),
    source,
    ...cats[i],
  }));
  if (!raw.length) warnings.push("No transactions found in this input.");
  return {
    source,
    fileName,
    parsed: raw.length,
    wouldAdd: transactions.length,
    duplicates,
    needsReview: transactions.filter((t) => t.confidence < 0.6).length,
    transactions,
    warnings,
  };
}
export async function previewFile(file: ImportFile): Promise<ImportPreview> {
  const { raw, source } = await parseFile(file);
  return prepare(raw, source, file.name);
}
export async function previewSms(text: string): Promise<ImportPreview> {
  return prepare(await parseSms(text), "sms");
}
export async function ingest(
  raw: RawTxn[],
  source: TxnSource,
  fileName?: string,
): Promise<ImportResult> {
  const importId = newId(),
    preview = await prepare(raw, source, fileName),
    warnings = preview.warnings;
  let duplicates = preview.duplicates,
    txns: Transaction[] = preview.transactions.map((t) => ({ ...t, importId }));
  await updateDb((d) => {
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
    for (const t of txns) {
      // A user may correct a merchant while an AI import is in flight; the current rules win.
      const category = categorizeSync(t, d.rules);
      if (
        category.categorySource === "user_rule" ||
        t.categorySource === "user_rule"
      ) {
        delete t.ruleId;
        Object.assign(t, category);
      }
      if (t.ruleId) {
        const rule = d.rules.find((r) => r.id === t.ruleId);
        if (rule) rule.hits++;
      }
    }
    d.transactions.push(...txns);
    d.transactions.sort((a, b) => a.date.localeCompare(b.date));
  });
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
