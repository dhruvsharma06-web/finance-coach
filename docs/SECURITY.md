# Security

## Threat model (10 lines)
1. A shared demo passcode protects all financial pages/APIs when KOSH_PASSCODE is set; unset keeps the public sample demo open.
2. SHA-256 digests are compared with timingSafeEqual; passcodes are never logged or stored in the database.
3. HMAC-SHA256 signs a seven-day expiry; tampered, noncanonical and expired session tokens are rejected.
4. kosh_session is HttpOnly, SameSite=Lax, path=/, and Secure in production; logout expires the browser cookie.
5. Five failed logins per forwarded client IP lock that IP for ten minutes, including concurrent failures.
6. CSP restricts resource origins, forms and framing; nosniff, referrer/permissions headers and production HSTS limit browser exposure.
7. API sliding windows bound expensive calls per IP; these and login lockouts are process-local and need shared storage for multi-instance enforcement.
8. Ingest masks runs of eight or more digits before AI classification/storage; one-way fingerprints preserve dedupe and export masks old records too.
9. Export/delete require the configured session; DELETE empties rather than seeds data, while POST /api/reset deliberately restores the demo.
10. AI keys remain server-only; deterministic money calculations and coach guardrails prohibit product picks and promised returns; inline-script CSP compatibility is not a complete XSS defense.

## Vercel configuration
Set KOSH_PASSCODE to a strong shared demo passcode and KOSH_SECRET to a separate random secret (at least 32 random bytes). Set both as server-only environment variables for the intended Vercel environments, then redeploy. Never prefix them with NEXT_PUBLIC_ or commit values. If KOSH_SECRET is absent, a SHA-256 digest of the passcode is used as the HMAC key; an independent secret is preferred.

This is shared demo access, not per-user accounts. Signing-secret rotation revokes existing cookies; logout clears the current browser cookie. The JSON demo store and process-local limits are not a durable multi-user production architecture. Forwarded IPs rely on the deployment's trusted reverse proxy. Configure shared sessions/rate limits and a durable per-user DB before a real-money launch.

## Endpoints
- POST /api/auth/login { passcode } -> { authenticated, required }, or 401/429 with Retry-After on lockout.
- GET /api/auth/session -> { authenticated, required }; POST /api/auth/logout clears the cookie.
- GET /api/data/export downloads kosh-export.json; DELETE /api/data -> { ok: true } removes all financial data and resets the profile to empty values.
- Limits per minute: coach 20, simulate 40, plan/fix 20, import 10, import/preview 10, profile/life-event 20. A blocked request returns 429 { error: "Too many requests, try again in a moment." } and Retry-After.

## Verification
npx tsx tests/round2.test.ts; npx tsx tests/brain.test.ts; npm run build; npx tsx scripts/test-security.ts. The security script starts and stops localhost-only production servers with an ephemeral test passcode and restores demo data after testing delete/reset.
