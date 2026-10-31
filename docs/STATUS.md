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

## Lane C (Codex #2): Brain
- (not started)





