import type { RawTxn } from "./index";

/**
 * LANE B (Codex). Indian bank / UPI transaction SMS, pasted as a block (one or many).
 * Must handle e.g.:
 *  "Rs.450.00 debited from A/c XX4821 on 28-10-26 to VPA swiggy@icici. UPI Ref 4302..."
 *  "INR 1,500.00 spent on HDFC Bank Card XX1234 at AMAZON on 2026-10-28."
 *  "Your a/c no. XXXXXXXX4821 is credited by Rs.95,000.00 on 01-10-26 by NEFT ACME..."
 * Regex first, LLM fallback for leftovers. Ignore OTP / promotional / balance-only SMS.
 * Stub: one generic regex, date defaults to today.
 */
export async function parseSms(text: string): Promise<RawTxn[]> {
  const out: RawTxn[] = [];
  const blocks = text.split(/\r?\n\s*\r?\n|\r?\n(?=.*(?:debited|credited|spent))/i);
  for (const b of blocks) {
    const amt = b.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)/i);
    if (!amt || !/debited|credited|spent|paid|received/i.test(b)) continue;
    const direction = /credited|received/i.test(b) ? "credit" : "debit";
    const to = b.match(/(?:to VPA|to|at)\s+([A-Za-z0-9@.\- ]{3,40}?)(?:\s+on\b|\.|$)/i);
    out.push({
      date: new Date().toISOString().slice(0, 10),
      description: b.trim().slice(0, 160),
      merchant: to?.[1]?.split("@")[0]?.trim(),
      amount: parseFloat(amt[1].replace(/,/g, "")),
      direction,
      mode: /upi|vpa/i.test(b) ? "upi" : /card/i.test(b) ? "card" : undefined,
    });
  }
  return out;
}
