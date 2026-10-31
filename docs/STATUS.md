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

## Round 2 (Codex)
- Part 1: POST /api/plan/fix { goalId?: string } returns { changes: ScenarioChange[], result: SimulationResult, explanation: string, feasible: boolean }. Deterministic weighted 5% search, cap-aware subscription cancellation, fewer than 400 simulations; seed solves in about 110 ms.
- User-approved demo assumption: MacBook target moved from September to 30 November 2027; SIP and all cut caps stay unchanged. No profile is mutated by the solver. Default production build and solver acceptance pass.
- Part 2: optional KOSH_PASSCODE login; GET /api/auth/session -> { authenticated, required }, POST /api/auth/login { passcode } -> { authenticated, required }, POST /api/auth/logout -> { authenticated: false }. HMAC-signed 7-day HttpOnly cookie and five-failure IP lockout; protected API requests return 401.
- Next.js 16 src/proxy.ts protects pages/APIs while leaving auth/static assets reachable. Simple /login uses existing UI tokens and Button. Passcode unset preserves the fully open demo; production build passes.
- Part 3: DELETE /api/data -> { ok: true } empties profile, transactions, rules, recurring, nudges and reports; POST /api/reset still restores the demo. GET /api/data/export downloads the full masked DB as kosh-export.json.
- CSP, nosniff, referrer/frame/permissions headers and production HSTS verified over HTTP. Account/reference runs of 8+ digits are masked before categorization/storage, with SHA-256 dedupe fingerprints. Desktop/mobile Chrome: login, fonts, charts and money-flow canvas render without CSP/JS errors; build green.
- Part 4: sliding windows in the shared handle() wrapper cover coach 20/min, simulate 40/min, plan/fix 20/min, import and preview 10/min each, profile/life-event 20/min. Limit response: 429 { error: "Too many requests, try again in a moment." } with Retry-After; successful shapes unchanged.
- Login failures are counted atomically after body parsing, so parallel attempts cannot bypass five-in-ten-minute lockout. Limits are per-process/per-forwarded-IP, suitable for the demo; shared deployment storage is needed for multi-instance global enforcement. Production build passes.
- Part 5: computeNudges adds unusual-spend warnings for >=2.5x earlier merchant median (at least two prior charges), or >=3x earlier category median above INR 2,000. At most two per data month, keyed by transaction id; dismissed alerts cannot refill the cap.
- NudgeType gains unusual; optional Nudge.relatedTransactionId and month are logged in the contract changelog. Existing UI severity/action rendering works unchanged. Planted 4x purchase and normal-purchase tests pass; build green.
- Part 6: deterministic Hinglish supports khana bahar/bahar khana, kapde, kam/ghata, aadha/aadhi, hazaar/hazar, lakh/lac/L, crore/cr and existing transport/fuel aliases. All five requested phrases parse without AI, including next-month phone purchases.
- Salary becoming INR 120000 produces income_abs delta +25000 for the INR 95000 seed, preserving the shared delta contract; projected income becomes 120000. Rent +3000 and category -30/-50 remain unchanged response shapes. Build green; brain tests pass.
- Part 7: tests/round2.test.ts covers feasible approved seed, grocery caps, impossible targets, anomaly thresholds/dedupe and all five Hinglish examples; scripts/test-security.ts prints a table for auth/lockout, cookie tampering/flags, all rate limits, masking/dedupe, export/delete/reset and open demo mode. tests/brain.test.ts and all Lane B regression suites pass.
- docs/SECURITY.md records the ten-line threat model and server-only KOSH_PASSCODE/KOSH_SECRET Vercel setup. Browser checks confirm protected login redirects, desktop/mobile layout, fonts, planner chart, money-flow canvas and voice-entry toasts under CSP with zero console errors. Final default build green.
- UI wiring: POST /api/plan/fix { goalId?: string } -> { changes: ScenarioChange[], result: SimulationResult, explanation: string, feasible: boolean }; GET /api/auth/session -> { authenticated, required }; POST /api/auth/login { passcode }; POST /api/auth/logout; GET /api/data/export (JSON attachment); DELETE /api/data -> { ok: true }. No components or page files changed except /login.

## Round 3 (Codex)
- Part A: Ask Kosh assistant mounted outside /login, page-aware English/Hinglish navigation, grounded filtering, what-ifs, fix-plan, theme and privacy actions; 44 utterance/guardrail cases pass. Conversation is session-local, with focus-trapped responsive dialog, Wispr hint and reduced-motion rendering.
- Published Bible Strong avatar-react/core renderer integrated with a recolored exported preset, lazy-loaded state animations. Repo now AGPL-3.0-only; LICENSE and README upstream credit/source link added as required. Deep links use ?fix=1, ?sample=kosh-demo-statement.csv and /goals#your-data. Build green; Google API access verified.
- Part B: added public JSON health, generic error/not-found pages, AES-256-GCM storage with fail-closed reads and atomic writes, scrypt hash support, 30-minute idle expiry, Origin checks, 5 MB/magic validation, JSON error handling and deployment docs. Google generation verified with gemini-3.8-flash after Google rejected the retired default.
- Strict CSP exposed upstream avatar runtime eval. Added a licensed, reproducible core fork with precompiled validation; CSP was not weakened. Fixed query-based transaction filters and added atomic correction Undo restoring category provenance, so learning still works after Undo. Static checks/build and expanded security tests pass.
- Final smoke: all nine nav pages/assistant, light and dark at 1440/390, navigate/what-if/fix/guardrail, #your-data scroll, all six sample imports, EatClub correction -> Undo -> correction again, planner charts, coach, life event, export/delete/reset and Ctrl+K passed on next start with zero browser errors. Lint/type checks, brain/round2/assistant and expanded security suites pass.
- Deployment target is explicitly pinned to Node 22.x in both project settings and package engines, so a broad >=22 range cannot select a newer major on Vercel.
- Live production: https://finance-coach-six.vercel.app (public, no Kosh passcode). Vercel project elites22/finance-coach uses Node 22.x, Google AI and private signing/data-encryption keys. Public health is 200 with AI available; live assistant navigation, sample deep-link import and Google-backed coach verified.
- Final verification: clean separate checkout npm ci + npm run build passed on Node v22.23.4; tsc and eslint clean; brain, round2, assistant, final-security and the expanded 12-row HTTP security suite pass. Prototype limitation remains ephemeral shared per-instance storage/rate limits, documented in SECURITY/DEPLOY.
