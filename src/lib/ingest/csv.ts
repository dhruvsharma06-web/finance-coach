import Papa from "papaparse";
import type { RawTxn } from "./index";

/**
 * LANE B (Codex). Bank CSV exports with unknown/messy headers
 * (HDFC, ICICI, SBI, Axis, Kotak; separate Debit/Credit columns OR a signed Amount;
 * DD/MM/YYYY, DD-MMM-YY, etc.; preamble rows before the real header; trailing summary rows).
 * Stub: handles Date, Description, Amount (signed).
 */
export async function parseCsv(text: string): Promise<RawTxn[]> {
  const { data } = Papa.parse<Record<string, string>>(text.trim(), { header: true, skipEmptyLines: true });
  const out: RawTxn[] = [];
  for (const row of data) {
    const keys = Object.keys(row);
    const get = (re: RegExp) => row[keys.find((k) => re.test(k.toLowerCase())) ?? ""];
    const date = get(/date/);
    const desc = get(/desc|narration|particular|remark/);
    const amt = parseFloat((get(/amount/) ?? "").replace(/[,₹\s]/g, ""));
    if (!date || !desc || Number.isNaN(amt)) continue;
    out.push({ date: toIsoDate(date), description: desc, amount: Math.abs(amt), direction: amt < 0 ? "debit" : "credit" });
  }
  return out;
}

export function toIsoDate(s: string): string {
  const m = s.trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
}
