# Status board

Each lane appends 2–3 lines after every push: what works, any API shape changes, known gaps.

## Lane A (Claude): UI
- 31 Oct: skeleton, contract, seed data, all API routes stubbed and verified end to end.
- 31 Oct, afternoon: full UI for all 8 screens shipped (ledger-ink + marigold design system, route view-transitions, intro, count-ups). Calls: `api.lifeEvent` → `POST /api/profile/life-event` (Lane C), quick-add sends `{ text, source: "voice", description, amount }` to `POST /api/transactions` (Lane B: parse `text` when present). Report page renders `byCategory`, `topMerchants`, `goalsProgress`, `wins`, `watchouts`, `narrative` (Lane C). Planner renders `GoalOutcome` dates + `summary` (Lane C).

## Lane B (Codex #1): Data engine
- CSV increment: bank header detection, day-first dates, amount shapes, and 60+ merchant aliases implemented. HDFC 10 / ICICI 3 / SBI 3 rows verified.
- CSV increment pushed. API shapes unchanged. The default npm run build is now green after the UI rebase; the earlier Windows worker failure cleared.
- Categorization increment: user rules precede 60+ built-in aliases, batched AI (60 per call), then low-confidence Other. Ingest validates rows, persists rule hits, and deduplicates inside each batch and concurrent imports.

- Categorization increment pushed. Correction increment: branded contains rules, exact person rules, direction scoping, conflict updates, and manual-category protection. EatClub test: preview 5 / appliedCount 5 / next import dining via user_rule.
- Added GET /api/transactions/:id/similar?category=x returning { similarIds, count }; PATCH /api/rules/:id accepts { category } and returns the updated rule. Existing correction response unchanged.

- Correction increment pushed. SMS increment: HDFC/ICICI/SBI/Axis/Kotak formats, statement dates, VPA/payee extraction, masks and payment modes; 10 real messages parsed, 3 spam/reminders ignored.
- ImportResult.warnings now carries ignored/unmatched SMS diagnostics. Unknown financial messages use one batched AI fallback; no-key sample fully passes.

- SMS increment pushed. Recurring increment: persisted weekly/monthly/quarterly/yearly detection, stable amounts and one price step; Netflix price_changed, Hotstar possibly_unused, rent/SIP/EMI not subscriptions. User confirmations/cancellations and ids survive refresh.
- Optional contract fields isNewSubscription and firstSeenDate are logged in CHANGELOG-CONTRACT.md for Lane C. The existing generateNudges() call is preserved.

- Recurring increment pushed. PDF increment: per-page unpdf extraction, two-page AI batches, Google scanned-PDF file fallback, validated text-only fallback and import warnings. Reproducible statement.pdf sample imports 10 rows without a key.
- PDF response shape unchanged. Live AI provider calls need a configured key; deterministic fallbacks and all API imports have passed locally.

- PDF increment pushed. Quick-add increment: POST /api/transactions accepts { text, source: "voice" } with AI parsing and a no-key spent/paid/received fallback; existing structured bodies still work.
- Final verification: parser, EatClub learning, engine, and live HTTP tests pass; all five sample files import and re-import without duplicates. 500-row no-key import measured 61-74 ms. Default npm run build green. AI paths type-checked; live key-dependent accuracy/latency remains unverified.

- Review increment: stricter input validation; no phantom voice transactions; specific-rule protection; retained price changes; pharmacy exclusions; per-chunk PDF fallback; current corrections override stale AI results.
- Added POST /api/import/preview (read-only { parsed, wouldAdd, duplicates, needsReview, transactions, warnings, source, fileName? }) and GET /api/transactions?needsReview=true. Existing successful shapes unchanged; malformed inputs now return 400/404/413/415.
- Parser/learning/engine/hardening/AI-fixture and HTTP tests pass, including 18 invalid requests without writes. scripts/README.md documents validation and Lane A/C handoffs; preview UI and live Lane C brain remain owned by those lanes.

## Lane C (Claude, taken over): Brain
- 31 Oct, evening: built by Claude since Lane C had not started. Deterministic engine (`simulate/baseline.ts`, `simulate/index.ts`) with deadline-then-priority goal funding over 36 months; regex-first NL parser with AI fallback (`simulate/parse.ts`, `simulate/nl.ts`); AI summary wrapper (`simulate/summary.ts`); nudges for drift, price change, unused/new subscriptions, goals at risk, low buffer and positives with month dedupe; monthly review with cached AI narrative and template fallback; coach with guardrail pre/post checks, what-if tool use and grounded template answers; `POST /api/profile/life-event`; `GET /api/report/months`. Tests: `npx tsx tests/brain.test.ts` (25 guardrail cases + 7 engine invariants, all pass).
- Lane A additions: Ctrl+K command palette, Overview month switcher, ranked nudges with show-more, How it works page, app icon + Open Graph metadata. Fixed a crash where an effect returned scrollIntoView's Promise.
