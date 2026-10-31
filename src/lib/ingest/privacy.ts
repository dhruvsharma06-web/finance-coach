import { createHash } from "node:crypto";
import type { Transaction } from "../types";
export function maskSensitive(text: string): string {
  return text.replace(/\d{8,}/g, (digits) => "XXXX" + digits.slice(-4));
}
export function transactionKey(t: {
  date: string;
  direction: string;
  amount: number;
  description: string;
  dedupeKey?: string;
}): string {
  return (
    t.dedupeKey ??
    createHash("sha256")
      .update(
        t.date +
          "|" +
          t.direction +
          "|" +
          t.amount.toFixed(2) +
          "|" +
          t.description.toLowerCase().replace(/\s+/g, " ").trim(),
      )
      .digest("hex")
  );
}
export function protectTransaction(t: Transaction): Transaction {
  return {
    ...t,
    dedupeKey: transactionKey(t),
    description: maskSensitive(t.description),
    ...(t.account ? { account: maskSensitive(t.account) } : {}),
  };
}
