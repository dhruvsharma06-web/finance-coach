# Contract changelog

Append one line whenever you add an optional field or helper to a shared contract file.

- 2026-10-31 · lane-a · initial contract (types.ts, db.ts, ai.ts, categories.ts, format.ts, seed.ts, api.ts, client.ts)
- Lane B: RecurringPayment adds optional isNewSubscription (subscription first seen within 45 days) and firstSeenDate (YYYY-MM-DD); Lane C may use these for new_subscription nudges.
