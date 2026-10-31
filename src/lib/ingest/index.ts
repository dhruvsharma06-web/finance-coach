import type { ImportResult, Transaction, TxnSource } from "../types";
import { newId, readDb, updateDb } from "../db";
import { categorizeBatch } from "../categorize";
import { detectRecurring } from "../recurring";
import { generateNudges } from "../insights/nudges";
import { parseCsv } from "./csv";
import { parsePdf } from "./pdf";
import { parseSms } from "./sms";

/**
 * LANE B (Codex) owns lib/ingest/**.
 * Every parser returns RawTxn[]; this orchestrator normalizes, dedupes,
 * categorizes, stores, then re-runs recurring detection and nudges.
 */

export interface RawTxn {
  date: string; // YYYY-MM-DD
  description: string;
  /** Parser may leave blank → derived from description */
  merchant?: string;
  amount: number; // positive
  direction: "debit" | "credit";
  mode?: Transaction["mode"];
  account?: string;
  balanceAfter?: number;
}

export async function importFile(file: { name: string; type: string; buffer: Buffer }): Promise<ImportResult> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv") || file.type.includes("csv")) {
    return ingest(await parseCsv(file.buffer.toString("utf8")), "csv", file.name);
  }
  if (lower.endsWith(".pdf") || file.type.includes("pdf")) {
    return ingest(await parsePdf(file.buffer), "pdf", file.name);
  }
  if (lower.endsWith(".txt")) return ingest(await parseSms(file.buffer.toString("utf8")), "sms", file.name);
  throw new Error("Unsupported file type. Upload a CSV or PDF, or paste SMS text.");
}

export async function importSms(text: string): Promise<ImportResult> {
  return ingest(await parseSms(text), "sms");
}

/** Rough merchant extraction — Lane B should improve (UPI handles, POS prefixes, ref numbers). */
export function deriveMerchant(description: string): string {
  const cleaned = description
    .replace(/^(UPI|POS|NEFT|IMPS|ACH|ATM)[\/\- ]+((DR|CR)[\/\- ]+)?/i, "")
    .replace(/@\w+/g, "")
    .split(/[\/]|-(?=\d)/)[0]
    .replace(/-/g, " ")
    .trim();
  const titled = cleaned.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return (titled || description).slice(0, 40);
}

export async function ingest(raw: RawTxn[], source: TxnSource, fileName?: string): Promise<ImportResult> {
  const importId = newId();
  const db = await readDb();
  const warnings: string[] = [];

  const key = (t: { date: string; amount: number; description: string }) =>
    `${t.date}|${t.amount.toFixed(2)}|${t.description.toLowerCase().replace(/\s+/g, " ").trim()}`;
  const existing = new Set(db.transactions.map(key));
  const fresh = raw.filter((r) => !existing.has(key(r)));
  const duplicates = raw.length - fresh.length;

  const withMerchant = fresh.map((r) => ({ ...r, merchant: r.merchant || deriveMerchant(r.description) }));
  const cats = await categorizeBatch(
    withMerchant.map((r) => ({ description: r.description, merchant: r.merchant, amount: r.amount, direction: r.direction })),
    db.rules,
  );

  const txns: Transaction[] = withMerchant.map((r, i) => ({
    id: newId(),
    date: r.date,
    description: r.description,
    merchant: r.merchant,
    amount: r.amount,
    direction: r.direction,
    mode: r.mode,
    account: r.account,
    balanceAfter: r.balanceAfter,
    source,
    importId,
    ...cats[i],
  }));

  if (raw.length === 0) warnings.push("No transactions found in this input.");

  await updateDb((d) => {
    d.transactions.push(...txns);
    d.transactions.sort((a, b) => a.date.localeCompare(b.date));
  });
  await detectRecurring();
  const newNudges = await generateNudges();

  return { importId, source, fileName, parsed: raw.length, added: txns.length, duplicates, transactions: txns, warnings, newNudges };
}
