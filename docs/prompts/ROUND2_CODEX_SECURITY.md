# Round 2 — Security, login & privacy (Codex #1, Dhruv's)

> Paste everything below the line into Codex. Strongest model, high reasoning. Run `git pull` first.

---

You are hardening **Kosh** (a personal-finance coach, Next.js 16 App Router, repo root) before tonight's deadline (31 Oct 2026, 11:59 PM IST). Read `AGENTS.md` first. This is Next.js 16: read `node_modules/next/dist/docs/` for anything about middleware/proxy, headers and cookies before writing code. `middleware.ts` may be renamed to `proxy.ts` in this version, so check the docs. Never add `export const dynamic`.

**You own:** `src/proxy.ts` (or `src/middleware.ts`, whichever the docs say), `src/lib/auth.ts`, `src/lib/rate-limit.ts`, `src/app/api/auth/**`, `src/app/api/data/**`, `src/app/login/page.tsx`, `next.config.ts` (headers only), `docs/SECURITY.md`, `scripts/test-security.ts`.
**Do not edit** other UI files or `src/lib/types.ts`. For the login page, reuse `Button` and `Panel` from `src/components/ui.tsx` and the design tokens (`bg-surface`, `text-ink`, `text-muted`, `bg-fill`, `font-display`). Large text: headings ≥ 40px, body ≥ 16px. Claude will polish it.

## 1. Optional passcode login (demo-safe)
- If env `KOSH_PASSCODE` is **unset**, the app stays open, which keeps the demo frictionless. If it is set, every page and `/api/*` route requires a session.
- `POST /api/auth/login { passcode }`: constant-time compare (`crypto.timingSafeEqual`), then set the cookie `kosh_session`. Its value is an HMAC-SHA256-signed token `{ exp }`, signed with `KOSH_SECRET` (falling back to a hash of the passcode). Set it `httpOnly`, `SameSite=Lax`, `Secure` in production, path `/`, 7-day expiry.
- `POST /api/auth/logout` clears it. `GET /api/auth/session` returns `{ authenticated, required }`.
- Proxy/middleware: if a passcode is required and there's no valid session, redirect pages to `/login?next=…` and return 401 JSON for `/api/*`. Allow `/login`, `/api/auth/*`, `/_next/*`, `/icon.svg` and static files.
- Brute-force protection: 5 failed attempts per IP per 10 minutes, then 429 with `Retry-After`.
- `/login` page: Kosh wordmark, "Enter your passcode", one input, one primary button, an error state, and redirect to `next` on success.

## 2. Security headers (`next.config.ts` `headers()`)
- `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`. (Inline is needed for the theme pre-paint script. Verify fonts still load. `next/font` self-hosts them.)
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), geolocation=(), microphone=(self)`, `Strict-Transport-Security: max-age=63072000; includeSubDomains` (production only).
- Run the app and confirm in the browser console that nothing breaks under the CSP (charts, view transitions, fonts, toasts).

## 3. Rate limiting for expensive routes
`src/lib/rate-limit.ts`: an in-memory sliding window keyed by IP (`x-forwarded-for` first hop, falling back to "local"). Apply it inside these handlers: `/api/coach` 20/min, `/api/simulate` 40/min, `/api/import` and `/api/import/preview` 10/min, `/api/profile/life-event` 20/min. Return 429 `{ error: "Too many requests, try again in a moment." }` with `Retry-After`. Keep every response shape otherwise unchanged.

## 4. Privacy controls
- Mask account and card numbers everywhere they're stored. `Transaction.account` and descriptions should never contain more than the last 4 digits. Sanitize in the ingest path (Lane B code is yours): replace runs of 8+ digits that look like account/card numbers with `XXXX` + the last 4. Keep UPI ref numbers out of the merchant name.
- `DELETE /api/data`: wipes everything to an **empty** profile (not the demo seed) and returns `{ ok: true }`. `POST /api/reset` still restores the demo.
- `GET /api/data/export`: downloads the user's full data as JSON (`Content-Disposition: attachment; filename="kosh-export.json"`).
- Never log request bodies. Check that no `console.log` prints transactions or passcodes.

## 5. Docs and tests
- `docs/SECURITY.md`: the threat model in 10 lines, what's protected and how (auth, cookie flags, CSP, rate limits, masking, guardrails against product advice, no secrets in the client, AI keys server-only), and how to set `KOSH_PASSCODE` / `KOSH_SECRET` on Vercel.
- `scripts/test-security.ts` (`npx tsx`): login success and failure, lockout after 5 failures, 401 without a cookie when a passcode is set, the security headers present, the rate limit triggering, account-number masking. Print a pass/fail table.
- `npm run build` must pass. Push small commits (`security: …`) and add 2–3 lines to `docs/STATUS.md` under a new heading "Security (Codex #1)".
