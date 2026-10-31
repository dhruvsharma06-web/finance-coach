import type { Cadence, RecurringPayment, Transaction } from "../types";
import { newId, updateDb } from "../db";
import { normalizeMerchant } from "../format";
const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  return a.length % 2
    ? a[(a.length - 1) / 2]
    : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
};
const cadences: [Cadence, number, number][] = [
  ["weekly", 7, 2],
  ["monthly", 30, 4],
  ["quarterly", 91, 7],
  ["yearly", 365, 10],
];
export async function detectRecurring(): Promise<RecurringPayment[]> {
  return updateDb((db) => {
    const previous = new Map(
      db.recurring.map((r) => [normalizeMerchant(r.merchant), r]),
    );
    const groups = new Map<string, Transaction[]>();
    for (const t of db.transactions)
      if (t.direction === "debit") {
        const key = normalizeMerchant(t.merchant);
        groups.set(key, [...(groups.get(key) ?? []), t]);
      }
    const result: RecurringPayment[] = [];
    for (const [merchant, items] of groups) {
      const ts = items.sort((a, b) => a.date.localeCompare(b.date));
      if (ts.length < 2) continue;
      const gaps = ts
        .slice(1)
        .map(
          (t, i) => (Date.parse(t.date) - Date.parse(ts[i].date)) / 86400000,
        );
      const gap = median(gaps),
        cadence = cadences.find(
          ([name, days, tolerance]) =>
            Math.abs(gap - days) <= tolerance &&
            (name !== "weekly" || ts.length >= 3),
        );
      if (!cadence) continue;
      const [name, days, tolerance] = cadence;
      if (gaps.some((g) => Math.abs(g - days) > tolerance)) continue;
      const amounts = ts.map((t) => t.amount),
        stable = (a: number[]) => {
          const m = median(a);
          return a.every((n) => Math.abs(n - m) / m <= 0.15);
        };
      // Accept a single stable-to-stable price step, reject fluctuating shopping.
      const step = amounts.findIndex(
        (a, i) => i > 0 && Math.abs(a - amounts[i - 1]) / amounts[i - 1] > 0.15,
      );
      if (
        !stable(amounts) &&
        !(
          step > 0 &&
          stable(amounts.slice(0, step)) &&
          stable(amounts.slice(step))
        )
      )
        continue;
      const last = ts.at(-1)!,
        prev = ts.at(-2)!,
        old = previous.get(merchant);
      const isSubscription =
        !["rent", "emi", "investments", "utilities"].includes(last.category) &&
        (["subscriptions", "entertainment", "health"].includes(last.category) ||
          /netflix|spotify|hotstar|icloud|youtube|prime|adobe|notion|openai/i.test(
            merchant,
          ));
      const pct = ((last.amount - prev.amount) / prev.amount) * 100;
      const priceChange =
        Math.abs(pct) > 5
          ? { from: prev.amount, to: last.amount, pct, date: last.date }
          : undefined;
      const next = new Date(last.date + "T00:00:00Z");
      if (name === "monthly" || name === "quarterly" || name === "yearly") {
        const day = next.getUTCDate();
        next.setUTCDate(1);
        next.setUTCMonth(
          next.getUTCMonth() +
            (name === "monthly" ? 1 : name === "quarterly" ? 3 : 12),
        );
        const end = new Date(
          Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
        ).getUTCDate();
        next.setUTCDate(Math.min(day, end));
      } else next.setUTCDate(next.getUTCDate() + 7);
      result.push({
        id: old?.id ?? newId(),
        merchant: last.merchant,
        category: last.category,
        cadence: name,
        averageAmount:
          Math.round((amounts.reduce((a, b) => a + b, 0) / ts.length) * 100) /
          100,
        lastAmount: last.amount,
        lastDate: last.date,
        nextExpectedDate: next.toISOString().slice(0, 10),
        firstSeenDate: ts[0].date,
        isNewSubscription:
          isSubscription &&
          (Date.now() - Date.parse(ts[0].date)) / 86400000 >= 0 &&
          (Date.now() - Date.parse(ts[0].date)) / 86400000 <= 45,
        transactionIds: ts.map((t) => t.id),
        isSubscription,
        userConfirmedInUse: old?.userConfirmedInUse ?? null,
        status:
          old?.status === "cancelled"
            ? "cancelled"
            : priceChange
              ? "price_changed"
              : isSubscription &&
                  old?.userConfirmedInUse == null &&
                  /hotstar|netflix|prime|youtube|disney/i.test(merchant)
                ? "possibly_unused"
                : "active",
        ...(priceChange ? { priceChange } : {}),
        confidence: Math.max(
          0.6,
          Math.min(
            0.99,
            1 -
              gaps.reduce((n, g) => n + Math.abs(g - days) / days, 0) /
                gaps.length,
          ),
        ),
      });
    }
    // A cancelled item remains visible even when its source rows were removed.
    for (const old of db.recurring)
      if (old.status === "cancelled" && !result.some((r) => r.id === old.id))
        result.push(old);
    for (const t of db.transactions) delete t.recurringId;
    for (const r of result)
      for (const id of r.transactionIds) {
        const t = db.transactions.find((t) => t.id === id);
        if (t) t.recurringId = r.id;
      }
    db.recurring = result;
    return result;
  });
}
