import Papa from "papaparse";
import { z } from "zod";
import { aiAvailable, aiObject } from "../ai";
import type { RawTxn } from "./index";
export function toIsoDate(value: string): string {
  const s = value.trim();
  let year: number, month: number, day: number;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T :])/);
  const local = s.match(
    /^(\d{1,2})[\/ .-]?(\d{1,2}|[A-Za-z]{3,9})[\/ .-]?(\d{4}|\d{2})$/,
  );
  if (iso) {
    year = +iso[1];
    month = +iso[2];
    day = +iso[3];
  } else if (local) {
    day = +local[1];
    year = +local[3];
    if (year < 100) year += 2000;
    month = /^\d+$/.test(local[2])
      ? +local[2]
      : [
          "jan",
          "feb",
          "mar",
          "apr",
          "may",
          "jun",
          "jul",
          "aug",
          "sep",
          "oct",
          "nov",
          "dec",
        ].indexOf(local[2].slice(0, 3).toLowerCase()) + 1;
  } else return "";
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
    ? d.toISOString().slice(0, 10)
    : "";
}
export function parseAmount(s = ""): number {
  const c = s.replace(/INR|Rs\.?|₹|,|\s|\b(?:Dr|Cr)\b/gi, "");
  return /^[-+]?\d+(?:\.\d+)?$/.test(c) ? Number(c) : NaN;
}
const mappingSchema = z.object({
  dateCol: z.number().int().nonnegative(),
  descCol: z.number().int().nonnegative(),
  debitCol: z.number().int().nonnegative().optional(),
  creditCol: z.number().int().nonnegative().optional(),
  amountCol: z.number().int().nonnegative().optional(),
  drCrCol: z.number().int().nonnegative().optional(),
});
export async function parseCsv(text: string): Promise<RawTxn[]> {
  const rows = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
  }).data;
  const score = (row: string[]) =>
    row.reduce(
      (n, c) =>
        n +
        Number(
          /date|narration|description|particulars|remarks|withdrawal|debit|deposit|credit|amount|balance|^dr$|^cr$/i.test(
            c,
          ),
        ),
      0,
    );
  let header = 0;
  rows.slice(0, 30).forEach((r, i) => {
    if (score(r) > score(rows[header])) header = i;
  });
  const cells = rows[header] ?? [];
  const col = (re: RegExp) => {
    const i = cells.findIndex((s) => re.test(s.trim()));
    return i < 0 ? undefined : i;
  };
  const indicator = col(/dr\s*[\/-]\s*cr|debit\s*[\/-]\s*credit|^type$/i);
  let map = {
    dateCol: col(/^(?:transaction\s*|txn\s*)?date$/i),
    descCol: col(/narration|desc|particular|remark/i),
    debitCol: col(/^(?:withdrawal|debit|dr\b)/i),
    creditCol: col(/^(?:deposit|credit|cr\b)/i),
    amountCol: col(/^(?:transaction\s*)?amount$/i),
    drCrCol: indicator,
  };
  if (map.debitCol === indicator) map.debitCol = undefined;
  if (map.creditCol === indicator) map.creditCol = undefined;
  if ((map.dateCol === undefined || map.descCol === undefined) && aiAvailable())
    try {
      map = {
        ...map,
        ...(await aiObject({
          schema: mappingSchema,
          prompt:
            "Map zero-based bank CSV column indexes. Never extract amounts. Rows: " +
            JSON.stringify(rows.slice(0, 40)),
        })),
      };
      header = -1;
    } catch {
      /* no-key behavior */
    }
  if (map.dateCol === undefined || map.descCol === undefined) return [];
  const out: RawTxn[] = [];
  for (const row of rows.slice(header + 1)) {
    const get = (i: number | undefined) =>
      i === undefined ? "" : (row[i] ?? "");
    const date = toIsoDate(get(map.dateCol)),
      description = get(map.descCol).trim();
    if (
      !date ||
      !description ||
      /^(?:opening balance|closing balance|total|statement summary)/i.test(
        description,
      )
    )
      continue;
    const debit = parseAmount(get(map.debitCol)),
      credit = parseAmount(get(map.creditCol)),
      signed = parseAmount(get(map.amountCol));
    const direction =
      debit > 0
        ? "debit"
        : credit > 0
          ? "credit"
          : /dr|debit/i.test(get(map.drCrCol) || get(map.amountCol)) ||
              signed < 0
            ? "debit"
            : "credit";
    const amount = debit > 0 ? debit : credit > 0 ? credit : Math.abs(signed);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const balanceAfter = parseAmount(get(col(/closing balance|^balance/i)));
    out.push({
      date,
      description,
      amount,
      direction,
      ...(Number.isFinite(balanceAfter) ? { balanceAfter } : {}),
    });
  }
  return out;
}
