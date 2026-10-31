import { z } from "zod";
import { aiAvailable, aiObject } from "../ai";
import { todayIST } from "./sms";
import { cleanMerchant } from "./merchant";
import { toIsoDate, parseAmount } from "./csv";
import type { RawTxn } from "./index";

/** Only completed transactions are eligible for quick-add. */
export async function parseQuickAdd(text: string): Promise<RawTxn | null> {
  const input = text.trim();
  const today = todayIST();
  if (
    !input ||
    /\b(?:will|would|should|could|plan|planning|tomorrow|next|not|never|haven't|havent|didn't|didnt|don't|dont|cancelled|failed)\b/i.test(
      input,
    )
  )
    return null;
  if (
    /\b(?:and|then|plus)\s+(?:(?:spent|paid|received)\s+)?(?:rs\.?|inr|₹)?\s*\d/i.test(
      input,
    )
  )
    return null;
  const actions = input.match(/\b(?:spent|paid|received)\b/gi);
  if (actions && actions.length > 1) return null; // Ask for one transaction at a time.
  const match = input.match(
    /^(?:(?:i|we)\s+)?(spent|paid|received)\s+(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:on|at|for|from)\s+(.+?)(?:\s+(?:on\s+)?(yesterday|today|\d{4}-\d{2}-\d{2}|\d{1,2}[\/-](?:\d{1,2}|[a-z]{3})[\/-]\d{2,4}))?[.!]?$/i,
  );
  if (match) {
    const dateToken = match[4]?.toLowerCase();
    let date = today;
    if (dateToken === "yesterday") {
      const d = new Date(today + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() - 1);
      date = d.toISOString().slice(0, 10);
    } else if (dateToken && dateToken !== "today") date = toIsoDate(dateToken);
    const amount = parseAmount(match[2]);
    if (!date || date > today || !Number.isFinite(amount) || amount <= 0)
      return null;
    return {
      date,
      description: input,
      merchant: cleanMerchant(match[3]),
      amount,
      direction: /received/i.test(match[1]) ? "credit" : "debit",
    };
  }
  if (aiAvailable()) {
    try {
      const row = await aiObject({
        schema: z.object({
          transaction: z
            .object({
              amount: z.number().positive(),
              merchant: z.string().min(1),
              direction: z.enum(["debit", "credit"]),
              date: z.string(),
            })
            .nullable(),
        }),
        system:
          "Parse exactly one completed transaction, never a question, plan, negation or multiple transactions. Return transaction:null when ambiguous or missing an amount. Today in India is " +
          today +
          ". Resolve relative dates as YYYY-MM-DD. Amount positive INR; never invent missing data.",
        prompt: input,
      });
      if (
        row.transaction &&
        toIsoDate(row.transaction.date) &&
        toIsoDate(row.transaction.date) <= today
      )
        return {
          ...row.transaction,
          date: toIsoDate(row.transaction.date),
          description: input,
          merchant: cleanMerchant(row.transaction.merchant),
        };
    } catch {
      /* No key/provider failure must leave the database unchanged. */
    }
  }
  return null;
}
