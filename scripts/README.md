# Lane B verification and integration

Run from the repository root:
```sh
npx tsx scripts/test-parsers.ts
npx tsx scripts/test-learning.ts
npx tsx scripts/test-engine.ts
npx tsx scripts/test-hardening.ts
npx tsx scripts/test-ai-fallbacks.ts
npm run build
```

DB tests restore the demo seed data. Run them in a local demo checkout.
The AI fixture intercepts fetch locally and exercises the real SDK schema/failure paths without a real provider/key. It covers invalid classifications, chunk boundaries, bad SMS/voice extraction, partial PDF extraction failure, and a user correction arriving while an AI import is in flight.

For HTTP acceptance, start `npm run start -- --hostname 127.0.0.1 --port 3101`, set TEST_BASE_URL=http://127.0.0.1:3101 in another terminal, then run `npx tsx scripts/test-api.ts`. This test resets the targeted demo database.

## New APIs ready for Lane A

- `POST /api/import/preview`: same multipart file or JSON `{ sms }` input as `/api/import`. Returns `{ source, fileName?, parsed, wouldAdd, duplicates, needsReview, transactions, warnings }`. Saves nothing, increments no rule hits, and refreshes no recurring payments or nudges. Preview ids are temporary. Submit the original input to `/api/import` to commit; it rechecks current rules and duplicates.
- `GET /api/transactions?needsReview=true`: filters confidence below 0.6 and combines with month/category/q.
- `GET /api/transactions/:id/similar?category=dining`: read-only correction preview; protects exact competing rules and manually set categories.
- Malformed input returns JSON 400; missing transaction ids return 404; unsupported import media returns 415; files over 10 MB return 413. Existing successful response contracts are unchanged.

## Highest-value remaining team work

1. Lane C: implement live nudge generation, coach responses, report narrative, and goal outcomes. These remain placeholders on reviewed main. Lane B preserves generateNudges().
2. Lane A: wire import preview before final submission and similar preview before bulk correction. Endpoints are ready; this change does not edit UI files.
3. Lane A: show Needs review for low-confidence AI results alongside the AI badge.
4. Before a real-money deployment: replace the shared JSON demo store with durable per-user persistence and access controls.

Real-provider extraction accuracy and latency still require verification with a configured key and representative statements. The fixture validates transport/schema/failure handling, not model accuracy.

