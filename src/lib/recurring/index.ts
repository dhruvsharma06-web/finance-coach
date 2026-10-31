import type { RecurringPayment } from "../types";
import { readDb } from "../db";

/**
 * LANE B (Codex) owns lib/recurring/**.
 * Detect recurring payments: group debits by normalized merchant, find regular intervals
 * (weekly ±2d, monthly ±4d, quarterly, yearly) with stable amounts (±15%), need ≥2 hits
 * (≥3 for weekly). Flag price changes (>5% vs previous charge), set isSubscription,
 * compute nextExpectedDate, mark "possibly_unused" for subscriptions the user hasn't
 * confirmed after 2+ cycles, PRESERVE userConfirmedInUse / "cancelled" from previous
 * runs, write transaction.recurringId back, persist with updateDb.
 * Stub: returns the stored (seeded) list unchanged.
 */
export async function detectRecurring(): Promise<RecurringPayment[]> {
  const db = await readDb();
  return db.recurring;
}
