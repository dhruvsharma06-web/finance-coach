# Kosh: your living money model

**Live demo:** [Open Kosh](https://finance-coach-six.vercel.app)

An AI personal-finance coach for India that **reads your messy statements, learns how you categorize, notices what changed, and models your what-ifs**, without ever recommending specific securities.

Built for the Product Space × Wispr Flow hackathon (problem 04), **entirely by voice** with Wispr Flow driving Claude Code and Codex.

## What it does
- **Ingest anything:** bank CSVs (any bank's layout), PDF statements, and pasted transaction SMS (OTP/promo spam ignored).
- **Categorize, then learn:** rules → merchant knowledge → AI. Fix one transaction and Kosh learns the rule, re-applies it to the past, and uses it on every future import.
- **Recurring & subscriptions:** detects cadence, flags price hikes, and asks "still using it?" instead of guessing.
- **Living financial profile:** income, fixed costs, emergency fund, and goals with dates. Tell it "rent went up to 28k" and the model updates.
- **What-if planner:** "What if I cut dining out by 30% and rent goes up 3k from January?" → projected savings and goal dates.
- **Nudges** when spending drifts off plan, and a **monthly review** written like a coach.
- **Guardrails:** educates and models scenarios; never names stocks, funds, or crypto to buy.

**Design principle: the AI parses and explains; deterministic code does every rupee of math.**

## Run it
```bash
npm install
cp .env.example .env.local   # add a Gemini or OpenAI key (optional: everything has fallbacks)
npm run dev
```
Open http://localhost:3000. Demo data for "Aarav" (Bengaluru, Aug–Oct 2026) loads automatically. `POST /api/reset` restores it. Sample inputs are in `samples/`.

## Architecture
```
src/lib/ingest      CSV · PDF · SMS parsers → normalized transactions
src/lib/categorize  rule engine + AI + correction learning
src/lib/recurring   cadence / price change / unused detection
src/lib/simulate    deterministic projection engine + NL → scenario
src/lib/insights    nudges + monthly review
src/lib/coach       chat + guardrails
src/app/api/*       thin route handlers
src/app/*           UI
```
Stack: Next.js 16, React 19, TypeScript, Tailwind v4, Vercel AI SDK (Gemini/OpenAI), Recharts.

## Team
Dhruv Sharma + teammate. See [docs/WISPR_LOG.md](docs/WISPR_LOG.md) for how we built it by voice.

## Licence
Kosh is licensed under AGPL-3.0-only; see [LICENSE](LICENSE). Source code for this network-served application is available in this public repository.
Avatar engine: Bible Strong Avatar Lab by smontlouis, AGPL-3.0. [Upstream source](https://github.com/smontlouis/bible-strong-avatar-lab).

## Deploy
See [Vercel deployment instructions](docs/DEPLOY.md). Node 22.x is configured on the hosted project; the public demo uses sample data and leaves the optional passcode unset.

## Security
See [security model and prototype limitations](docs/SECURITY.md). Storage supports AES-256-GCM, passcodes support scrypt, sessions expire after 30 idle minutes, and mutation requests enforce Origin checks. Public-demo storage and process-local limits are not per-user production infrastructure.

## Verify
`npm run build`, `npx tsc --noEmit`, `npx eslint src`, `npx tsx tests/brain.test.ts`, `npx tsx tests/round2.test.ts`, `npx tsx tests/assistant.test.ts`, `npx tsx scripts/test-security.ts`.

