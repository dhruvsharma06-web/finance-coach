# Round 2: everything for one Codex agent

> Run `git pull` first. Paste everything below the line into Codex. Strongest model, high reasoning.
> This replaces ROUND2_CODEX_SECURITY.md and ROUND2_CODEX_FEATURES.md.

---

You are the backend engineer on **Kosh**, an AI personal-finance coach for India (Next.js 16 App Router, TypeScript, repo root). The deadline is **tonight, 31 Oct 2026, 11:59 PM IST**. Claude owns all UI and is working in parallel, so **do not edit any file in `src/components/**` or any `page.tsx` except `src/app/login/page.tsx`.**

## Before you write code
1. Read `AGENTS.md`, `src/lib/types.ts`, `src/lib/api.ts`, `src/lib/db.ts`, `src/lib/ai.ts`, `src/lib/simulate/*`, `src/lib/insights/nudges.ts`, `tests/brain.test.ts`.
2. This is Next.js 16 with `cacheComponents`. Read `node_modules/next/dist/docs/` before touching middleware/proxy, headers or cookies (`middleware.ts` may be called `proxy.ts` now). Never add `export const dynamic`. Wrap every route handler in `handle()` from `src/lib/api.ts`.
3. Types: only **add optional fields or union members** to `src/lib/types.ts`, and log each one in `docs/CHANGELOG-CONTRACT.md`.
4. **The LLM never computes numbers.** Every AI call needs a no-key fallback (`aiAvailable()`).
5. Work in this order. After each part: `npm run build` passes, then commit (`round2: …`), `git pull --rebase`, push, and add 2–3 lines to `docs/STATUS.md` under "Round 2 (Codex)" with any new response shapes.

---

## Part 1: "Fix my plan" (highest priority)
`POST /api/plan/fix { goalId?: string }` → `{ changes: ScenarioChange[], result: SimulationResult, explanation: string, feasible: boolean }`
Files: `src/lib/simulate/solve.ts`, `src/app/api/plan/fix/route.ts`.

Find the **smallest, most realistic set of spending cuts** that puts every goal (or just `goalId`) on track, using the deterministic engine (`simulate()` from `src/lib/simulate`).
- Levers: `category_pct` cuts on the categories in `buildBaseline(profile, txns).variableByCategory` (dining, shopping, entertainment, subscriptions, travel, transport, groceries), plus cancelling `possibly_unused` subscriptions (`category_abs` on `subscriptions` = minus their monthly amount).
- Cost weights (wants are cheaper to cut): dining/shopping/entertainment/travel 1, subscriptions 0.8, transport 1.5, groceries 2. Cap: 40% per category, 15% for groceries.
- Greedy search: repeatedly add the 5% step with the best ratio of (total goal-months gained ÷ weighted ₹ cost) until all target goals have `onTrackScenario`, or until every cap is hit. In that case return `feasible: false` with the best plan, and an explanation suggesting a later date or more income. Merge to one change per category. Fewer than 400 `simulate()` calls; under 1.5 s with no AI.
- `explanation`: a template, plus an `aiText` rewrite when `aiAvailable()` (system = `COACH_GUARDRAILS` + "use only these numbers"). Example: "Trim dining by 25% and shopping by 15% (about ₹4,700 a month) and all three goals land on time. Your emergency fund is the tightest: it finishes in June 2027, right on target."
- Rate limit (Part 4) applies.

## Part 2: Passcode login (demo-safe)
Files: `src/proxy.ts` (or `src/middleware.ts`, per the docs), `src/lib/auth.ts`, `src/app/api/auth/{login,logout,session}/route.ts`, `src/app/login/page.tsx`.
- If env `KOSH_PASSCODE` is **unset**, the app stays fully open (the demo must not break). If set, every page and `/api/*` route requires a session.
- `POST /api/auth/login { passcode }`: compare with `crypto.timingSafeEqual`, then set cookie `kosh_session` = an HMAC-SHA256-signed `{ exp }`, signed with `KOSH_SECRET` (fallback: SHA-256 of the passcode). Flags: `httpOnly`, `SameSite=Lax`, `Secure` in production, `path=/`, 7-day expiry.
- Lockout: 5 failed attempts per IP per 10 minutes, then 429 with `Retry-After`.
- `POST /api/auth/logout` clears it. `GET /api/auth/session` returns `{ authenticated, required }`.
- Proxy: no valid session means pages redirect to `/login?next=…` and `/api/*` returns 401 JSON. Always allow `/login`, `/api/auth/*`, `/_next/*`, `/icon.svg` and static files.
- `/login` page: keep it simple, Claude will restyle it. Use `Button` from `@/components/ui` and tokens (`bg-bg`, `bg-surface`, `text-ink`, `text-muted`, `font-display`). Show the "Kosh" wordmark, the heading "Enter your passcode" (≥ 40px), one password input (≥ 17px text), one primary button and an error message, then redirect to `next` on success.

## Part 3: Security headers + privacy
- In `next.config.ts` `headers()`, for all routes:
  `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
  plus `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), geolocation=(), microphone=(self)`, and HSTS (`max-age=63072000; includeSubDomains`) in production only.
  Run the app and confirm in the console that nothing breaks: fonts, charts, view transitions, the money-flow canvas, toasts.
- Masking: in the ingest path, replace any run of 8+ digits that looks like an account or card number with `XXXX` + the last 4, in both `description` and `account`. Keep UPI refs out of merchant names.
- `DELETE /api/data`: wipes to an **empty** profile and data, not the demo seed. `POST /api/reset` still restores the demo.
- `GET /api/data/export`: the full JSON, with `Content-Disposition: attachment; filename="kosh-export.json"`.
- No `console.log` of request bodies, transactions or passcodes anywhere.

## Part 3b: Bank-grade data protection (people upload real statements)
- **Encryption at rest:** encrypt the whole DB file with AES-256-GCM (`crypto.createCipheriv`). Use a random 12-byte IV per write, and store `{ v, iv, tag, data }` as JSON. Key = env `KOSH_DATA_KEY` (32 bytes, base64). If the key is unset, generate one into `data/.key` locally with file mode 0600 and log a one-line warning, and require the env var in production. Do this inside `src/lib/db.ts` `load()`/`persist()` only, keeping `readDb()`/`updateDb()` signatures unchanged. A tampered file must fail the GCM auth tag and reseed instead of crashing.
- **Uploaded files are never stored.** Parse in memory, keep only the normalized transactions, and drop the buffer. Reject files over 5 MB (413) and anything that isn't CSV/PDF/TXT by magic bytes, not just by extension (415).
- **Passcode at rest:** if `KOSH_PASSCODE_HASH` is set (scrypt `salt:hash`), compare against it instead of the plaintext env var. Ship `scripts/hash-passcode.ts` to generate it.
- **Sessions:** 30-minute idle timeout (sliding: refresh `exp` on activity) plus a 7-day absolute cap. Rotate the token on login. Logout clears it server-side by bumping a `sessionVersion` stored in the DB.
- **CSRF:** for every non-GET `/api/*` request, require `Origin` (or `Referer`) to match the host, else 403. `SameSite=Lax` stays as a second layer.
- **No sensitive data in logs or errors:** errors returned to the client are generic, and details go to `console.error` without bodies.
- **Data minimisation:** store only date, narration (masked), merchant, amount, direction and category. Never store the full account number, card number, balance history beyond `balanceAfter`, or the uploaded filename's path.
- Add every point above to `docs/SECURITY.md`, and add tests to `scripts/test-security.ts` (encrypted file isn't plaintext, a tampered file is rejected, cross-origin POST gets 403, the idle timeout expires).

## Part 4: Rate limiting
`src/lib/rate-limit.ts`: an in-memory sliding window keyed by IP (first hop of `x-forwarded-for`, else "local"). Limits: `/api/coach` 20/min, `/api/simulate` 40/min, `/api/plan/fix` 20/min, `/api/import` and `/api/import/preview` 10/min, `/api/profile/life-event` 20/min, login per Part 2. Return 429 `{ error: "Too many requests, try again in a moment." }` with `Retry-After`. Leave successful response shapes unchanged.

## Part 5: Unusual-spend alerts
In `computeNudges` (`src/lib/insights/nudges.ts`), add `"unusual"` to `NudgeType` (additive) and flag a debit in the latest month when either:
- it is ≥ 2.5× that merchant's median over earlier months (with ≥ 2 earlier transactions), or
- it is ≥ 3× the category's median single transaction and > ₹2,000.

Title "Unusual: ₹4,554 at Toit"; body "That's about 3× what you usually spend there."; action `{ label: "Review", href: "/transactions" }`; severity `warning`. Dedupe per transaction id, max 2 per month.

## Part 6: Hinglish what-ifs (no AI key needed)
Extend `src/lib/simulate/nl.ts` and `parse.ts` so these parse correctly:
- "khana bahar 30% kam karu toh?" → dining −30
- "rent 3 hazaar badh gaya" → Rent +3000
- "salary 1.2 lakh ho gayi" → income_abs to 120000
- "shopping aadhi kar du" → shopping −50
- "₹50k ka phone le lu next month" → one_time 50000, startMonth 1

Vocabulary: hazaar/hazar = 1,000; lakh/lac/L = 1,00,000; crore/cr; kam/ghata = reduce; badh/zyada = increase; aadha/aadhi = half; khana bahar/bahar khana = dining; kapde = shopping; petrol = fuel; ola/uber/auto = transport.

## Part 7: Tests + docs
- `tests/round2.test.ts` (`npx tsx`), using `buildSeed()`:
  - fix-my-plan is `feasible` for the seed, with every goal `onTrackScenario`
  - groceries are never cut past 15%
  - a planted 4× transaction is flagged as unusual and normal ones aren't
  - all 5 Hinglish phrases parse
- `scripts/test-security.ts`: login success and failure, lockout, 401 without a cookie when a passcode is set, headers present, rate limit triggers, account masking. Print a pass/fail table.
- `tests/brain.test.ts` must still pass.
- `docs/SECURITY.md`: a 10-line threat model; what's protected and how (auth, cookie flags, CSP, rate limits, masking, guardrails against product advice, AI keys server-only); how to set `KOSH_PASSCODE` and `KOSH_SECRET` on Vercel.

## Done means
Every part is pushed, `npm run build` is green, both test files pass, and `docs/STATUS.md` lists the exact shape of `/api/plan/fix` plus the new endpoints, so Claude can wire the "Fix my plan" button, the login page polish, and the export/delete buttons.
