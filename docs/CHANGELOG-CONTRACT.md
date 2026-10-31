# Contract changelog

Append one line whenever you add an optional field or helper to a shared contract file.

- 2026-10-31 · lane-a · initial contract (types.ts, db.ts, ai.ts, categories.ts, format.ts, seed.ts, api.ts, client.ts)
- Lane B: RecurringPayment adds optional isNewSubscription (subscription first seen within 45 days) and firstSeenDate (YYYY-MM-DD); Lane C may use these for new_subscription nudges.
- Round 2: Transaction.dedupeKey?: string stores a one-way SHA-256 fingerprint so account/reference masking preserves deterministic import deduplication.
- Round 2: NudgeType adds unusual. Nudge adds optional relatedTransactionId and month (YYYY-MM) for transaction-level, month-scoped anomaly deduplication.
