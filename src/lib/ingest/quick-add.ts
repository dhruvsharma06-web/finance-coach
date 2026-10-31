import { z } from "zod";
import { aiAvailable, aiObject } from "../ai";
import { todayIST } from "./sms";
import { cleanMerchant } from "./merchant";
import { toIsoDate, parseAmount } from "./csv";
import type { RawTxn } from "./index";
export async function parseQuickAdd(text: string): Promise<RawTxn | null> {
  const today = todayIST();
  if (aiAvailable())
    try {
      const row = await aiObject({
        schema: z.object({
          amount: z.number().positive(),
          merchant: z.string().min(1),
          direction: z.enum(["debit", "credit"]),
          date: z.string(),
        }),
        system:
          "Parse one actual transaction, not a plan or request. Today in India is " +
          today +
          ". Resolve relative dates. Dates YYYY-MM-DD, amount positive INR. Do not invent missing amounts.",
        prompt: text,
      });
      if (toIsoDate(row.date))
        return {
          ...row,
          date: toIsoDate(row.date),
          description: text,
          merchant: cleanMerchant(row.merchant),
        };
    } catch {
      /* regex fallback */
    }
  const match = text.match(
    /\b(spent|paid|received)\s+(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:on|at|for|from)\s+(.+?)(?:\s+(yesterday|today|\d{4}-\d{2}-\d{2}))?\s*$/i,
  );
  if (!match) return null;
  let date = today;
  if (match[4] === "yesterday") {
    const d = new Date(today + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    date = d.toISOString().slice(0, 10);
  } else if (match[4] && toIsoDate(match[4])) date = toIsoDate(match[4]);
  const amount = parseAmount(match[2]);
  if (!(amount > 0)) return null;
  return {
    date,
    description: text,
    merchant: cleanMerchant(match[3]),
    amount,
    direction: /received/i.test(match[1]) ? "credit" : "debit",
  };
}
