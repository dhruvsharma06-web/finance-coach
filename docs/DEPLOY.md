# Deploy Kosh to Vercel
1. Import https://github.com/dhruvsharma06-web/finance-coach in the chosen Vercel workspace.
2. Select Next.js, repository root, Node 22.x, install `npm ci`, build `npm run build`.
3. Set server-only production/preview variables: AI_PROVIDER=google; GOOGLE_GENERATIVE_AI_API_KEY; AI_MODEL=gemini-3.8-flash (verified with the provided key); KOSH_SECRET; KOSH_DATA_KEY.
4. Generate each independent secret with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. KOSH_DATA_KEY must be 32 random bytes encoded as base64 (or 64 hex digits). Save keys securely; changing the data key without decrypting/re-encrypting the DB makes existing ciphertext unreadable.
5. Leave KOSH_PASSCODE and KOSH_PASSCODE_HASH unset on the public judges' sample demo. For a second secure deployment set a passcode or a scrypt hash, along with a separate signing secret.
6. Deploy main. The prebuild script copies samples/ to public/samples/. Verify sample buttons and /api/health on the live URL.
7. Check assistant navigation, what-if, Fix my plan, guardrail replies, /goals#your-data, chart rendering, themes, export, delete and demo reset.
8. For Open Graph set NEXT_PUBLIC_SITE_URL to the final public HTTPS origin; otherwise metadataBase uses VERCEL_URL. Never prefix secrets with NEXT_PUBLIC_.

## Demo limitations
The encrypted JSON DB lives in /tmp separately in each serverless instance. Data is ephemeral, may reseed after cold starts, and can differ across instances. Anonymous visitors to the public demo do not have isolated accounts: use sample data only. In-memory limits and lockouts are also per instance. Production requires shared sessions/limits in Vercel KV or Upstash Redis, and durable per-user Postgres (Neon/Supabase) with row-level encryption and authorization.

Kosh accepts uploads up to 5 MB; Vercel's request-body limit may be lower, so use the small bundled samples. Deployments serve AGPL-3.0-only code with the corresponding public source linked from the assistant and README.

## Checks
```sh
npm ci
npm run build
npx tsc --noEmit
npx eslint src
npx tsx tests/brain.test.ts
npx tsx tests/round2.test.ts
npx tsx tests/assistant.test.ts
npx tsx scripts/test-security.ts
```
Tests use demo data and disable live AI by default. The server-test wrapper loads ignored local encryption/signing settings so it can safely read an encrypted local DB. Set TEST_LIVE_AI=1 only for explicit live-provider tests. The private .env.local file and .vercel metadata must never be committed.

