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

## Round 3 final pass
- AES-256-GCM at rest: KOSH_DATA_KEY accepts 32-byte base64 or 64-character hex. Each write uses a fresh 12-byte IV and authentication tag, then an atomic rename. Plaintext DBs migrate when a key is configured. Wrong keys/corrupt ciphertext fail closed and never silently replace user data with a seed. Without a key local development remains plaintext; the hosted demo configures a key.
- Scrypt: optional KOSH_PASSCODE_HASH uses scrypt$salt$hexDigest (64-byte digest). Generate with hashPasscode() in src/lib/auth.ts. Hash takes precedence over plaintext and comparisons remain timing safe. KOSH_SECRET is still required for a strong independent signing key.
- Idle expiry: signed sessions carry issued-at/last-activity and expire after 30 idle minutes, with a seven-day absolute lifetime. Proxy refreshes activity only after validating a protected request.
- CSRF: non-GET API requests reject a foreign/null Origin or cross-site fetch metadata. Requests without Origin remain available to CLI clients; browser cookies use SameSite=Lax.
- Uploads: 5 MB maximum per file, PDF magic header validation, UTF-8/control-byte validation for text. The platform's transport cap may be lower.
- /api/health is public and contains version/provider/availability flags only, never credentials. Assistant is limited to 30 requests/minute per instance/IP.
- Vercel /tmp storage, rate limits and lockouts are ephemeral and per instance; data can differ between instances. Use sample data on the public demo. Production path: Vercel KV/Upstash Redis for shared sessions/limits and Postgres (Neon/Supabase) with per-user authorization and row-level encryption.
- Avatar CSP: the published renderer used runtime AJV compilation. Kosh vendors its AGPL core with a generated standalone schema validator, retaining full validation without unsafe-eval. scripts/prepare-avatar.cjs regenerates the fork from the pinned package; generated upstream code is excluded from style lint only.
