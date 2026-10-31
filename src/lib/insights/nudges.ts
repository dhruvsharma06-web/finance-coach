import type { Nudge } from "../types";

/**
 * LANE C (friend's Codex). Generate nudges after each import / on demand:
 * - overspend_pace: category spend vs budget × fraction of month elapsed (>1.15 warning, >1.4 critical)
 * - price_change / new_subscription / unused_subscription: from the recurring list
 * - goal_at_risk: goal not reachable by targetDate at the current savings rate
 * - low_buffer: emergency fund < 3 months of expenses
 * - positive: under budget, savings rate up, etc.
 * Dedupe by (type + related id + month); never re-create a dismissed nudge in the same month.
 * Persist via updateDb and return only the NEW nudges.
 * Stub: returns [] (seed nudges already exist).
 */
export async function generateNudges(): Promise<Nudge[]> {
  return [];
}
