import { z } from "zod";
import { aiAvailable, aiObject } from "../ai";
import { toIsoDate, parseAmount } from "./csv";
import { cleanMerchant } from "./merchant";
import { withWarnings } from "./warnings";
import type { RawTxn } from "./index";
export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export async function parseSms(text: string): Promise<RawTxn[]> {
  const messages = text
    .trim()
    .split(
      /\r?\n\s*\r?\n|\r?\n(?=(?:Rs\.?|INR|Your |Dear |ICICI |HDFC |SBI |Axis |Kotak |OTP|Get |Avl |Available ))/i,
    )
    .filter((s) => s.trim());
  const out: RawTxn[] = [],
    leftovers: string[] = [];
  let skipped = 0;
  for (const message of messages) {
    const s = message.replace(/\s+/g, " ").trim();
    const amount = s.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (
      /\botp\b|one.time.password|verification code|cashback offer|offer|payment due|amount due|failed|declined|unsuccessful|reversed|not processed/i.test(
        s,
      ) ||
      !amount ||
      !/debit|credit|spent|paid|sent|received/i.test(s)
    ) {
      skipped++;
      continue;
    }
    // Direction comes from the account action, never from a recipient being credited.
    const action =
      s.match(/debited|credited|spent|paid|sent|received/i)?.[0] ?? "";
    const direction = /credited|received/i.test(action) ? "credit" : "debit";
    const dateText = s.match(
      /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b|\b\d{1,2}[ -]?[A-Za-z]{3}[ -]?\d{2,4}\b/,
    )?.[0];
    const date = dateText ? toIsoDate(dateText) : todayIST();
    const merchant =
      s.match(
        /(?:to\s+VPA|towards|transfer to|\bat)\s+(.+?)(?=\s+(?:on|ref|upi ref|from a\/c)\b|[;(]|$)/i,
      )?.[1] ??
      s.match(/\bto\s+(.+?)(?=\s+(?:on|from|ref)\b|\s*\(|$)/i)?.[1] ??
      s.match(/[;:]\s*([A-Z][A-Z .+]+?)\s+credited\b/i)?.[1] ??
      s.match(
        /\b(?:UPI\s+from|by NEFT|from)\s+([A-Z][A-Z .]+?)(?=\s*\(|\s+Ref\b|$)/i,
      )?.[1];
    if (!merchant || !date) {
      leftovers.push(s);
      continue;
    }
    const mask = s.match(/(?:a\/c(?: no\.)?|acct|card)\s*([X*]+\d{2,4})/i)?.[1];
    const bank = s.match(
      /\b(HDFC|ICICI|SBI|Axis|Kotak)\s+(?:Bank|A\/c|Acct|Card)/i,
    )?.[1];
    out.push({
      date,
      description: s,
      merchant: cleanMerchant(
        merchant.replace(/\.\s*(?:UPI|Avl|Not you).*$/i, "").replace(/\.$/, ""),
      ),
      amount: parseAmount(amount[1]),
      direction,
      mode: /upi|vpa|@[a-z]/i.test(s)
        ? "upi"
        : /card/i.test(s)
          ? "card"
          : /neft/i.test(s)
            ? "neft"
            : /imps/i.test(s)
              ? "imps"
              : "netbanking",
      ...(mask ? { account: (bank ? bank + " " : "") + mask } : {}),
    });
  }
  if (leftovers.length && aiAvailable())
    try {
      const parsed = await aiObject({
        schema: z.object({
          transactions: z.array(
            z.object({
              date: z.string(),
              description: z.string(),
              merchant: z.string(),
              amount: z.number().positive(),
              direction: z.enum(["debit", "credit"]),
            }),
          ),
        }),
        system:
          "Extract actual posted Indian bank transactions only. Dates are day-first, today is " +
          todayIST() +
          ". Ignore spam, OTP, failures, balance alerts and reminders. Do not invent rows.",
        prompt: JSON.stringify(leftovers),
      });
      out.push(
        ...parsed.transactions
          .filter((t) => !!toIsoDate(t.date) && t.description.trim())
          .map((t) => ({
            ...t,
            date: toIsoDate(t.date),
            merchant: cleanMerchant(t.merchant),
          })),
      );
    } catch {
      /* report unmatched below */
    }
  const warnings: string[] = [];
  if (skipped)
    warnings.push(
      "Ignored " + skipped + " non-transaction messages (OTP/promotional)",
    );
  if (leftovers.length && out.length < messages.length - skipped)
    warnings.push(
      "Some financial messages could not be parsed; review the source SMS.",
    );
  return withWarnings(out, warnings);
}
