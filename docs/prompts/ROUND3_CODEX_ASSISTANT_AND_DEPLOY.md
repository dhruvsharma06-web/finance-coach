# Round 3: Kosh assistant (avatar chatbot that answers and navigates) + pre-deploy hardening

> Run `git pull` first. Paste everything below the line into Codex. Strongest model, high reasoning.

---

You are finishing **Kosh** (an AI personal-finance coach, Next.js 16 App Router, TypeScript, Tailwind v4) for a deploy to Vercel tonight. The deadline is **31 Oct 2026, 11:59 PM IST**. Read `AGENTS.md`, `docs/STATUS.md`, `src/lib/client.ts`, `src/lib/coach/*`, `src/components/shell/app-shell.tsx`, `src/components/shell/command-palette.tsx`, `src/app/globals.css` (design tokens) first. This is Next.js 16: read `node_modules/next/dist/docs/` before touching routing, error pages or config. Never add `export const dynamic`; wrap route handlers in `handle()`.

**You own (new):** `src/components/assistant/**`, `src/lib/assistant/**`, `src/app/api/assistant/route.ts`, `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/api/health/route.ts`, `vercel.json` (if needed), `docs/DEPLOY.md`, `tests/assistant.test.ts`.
**You may edit (minimal):** one line in `app-shell.tsx` to mount `<Assistant />`; `next.config.ts` CSP only if the avatar needs it; `src/lib/rate-limit.ts` (fix the lint error).
**Do not restyle existing pages.** Claude owns the design. Use only the existing tokens (`bg-surface`, `bg-ink`, `text-muted`, `bg-fill`, `font-display`, `.reveal`, `.rise`) and `Button`/`Badge` from `@/components/ui`. Large text: messages ≥ 16px, headings ≥ 22px.

---

## Part A: "Ask Kosh" assistant with an animated avatar

### A1. The avatar (from github.com/smontlouis/bible-strong-avatar-lab)
That repo is a React 19 + TypeScript studio for **procedural 2D SVG avatars**. Avatars are exported as `.avatar.json` and rendered with `@bible-strong/avatar-react` (`createAvatar`) or `@bible-strong/avatar-web`. It supports named expressions, timeline animations (loop / once / ping-pong), automatic blinking and ambient movement.
1. **License check first:** the repo is **AGPL-3.0**. Using its code or packages in a publicly served app means our repo must also be AGPL-compatible. Our GitHub repo is public, so add a `LICENSE` (AGPL-3.0) and a credit line in `README.md` ("Avatar engine: Bible Strong Avatar Lab by smontlouis, AGPL-3.0"). Tell Dhruv in `docs/STATUS.md` that you did this.
2. Try `npm view @bible-strong/avatar-react` and `npm view @bible-strong/avatar-core`. **If they're published:** install them, and get an avatar JSON from the repo (look for example/preset `.avatar.json` files or test fixtures). If there isn't one, clone the repo, run its studio (`pnpm i && pnpm dev`, Node 22.12+), build a simple friendly avatar that fits our palette (ink #0f100d, paper #f4f4f0, marigold #f2ac2b accent), export `public/avatar/kosh.avatar.json`, and commit it.
3. **If the packages aren't published:** run the repo's `scripts/generate-standalone-engine.mjs` and vendor the generated standalone runtime into `src/components/assistant/avatar-engine/` with its license header. Load the JSON from `public/avatar/`.
4. **If neither works within 40 minutes:** build `src/components/assistant/kosh-avatar.tsx` yourself. It's a small inline-SVG face in our palette (marigold dot motif, ink outline) with CSS/Motion states. Don't burn the evening on the dependency.
5. Wrap the avatar in `<KoshAvatar state="idle" | "listening" | "thinking" | "talking" | "happy" | "concerned" size={…} />`. Map the states to the avatar's named expressions/animations: idle = ambient + blink; thinking = a looping "hmm" while waiting for the API; talking = a mouth loop while the reply types out; happy = a positive nudge or a goal on track; concerned = a guardrail or overspend. Respect `prefers-reduced-motion` (static expression).
6. Lazy-load the avatar (`next/dynamic` or `React.lazy`) so it never blocks first paint. It must not break the CSP. If it needs `blob:` or `data:` images, update `img-src` only.

### A2. The widget
- A floating launcher bottom-right: the avatar at 56px plus "Ask Kosh". It opens a panel, 420px wide on desktop and a full-height sheet on mobile, with a big avatar header (~120px) showing the current state.
- Chat list (user bubbles in ink, Kosh replies on surface), suggested chips for the current page (below), an input with a mic hint ("Hold your Wispr Flow key and talk"), Enter to send, Esc to close, focus trapped while open, `aria-live="polite"` on replies.
- Replies type out (fast, ~12ms/char) while the avatar is in `talking`.
- Persist the conversation in `sessionStorage` (try/catch), and clear it on "New chat".
- Hidden on `/login`. Opening the ⌘K palette closes the widget.

### A3. The assistant brain: answer **and** navigate
`POST /api/assistant { messages: CoachMessage[], page: string }` returns `{ reply: CoachMessage, actions: AssistantAction[] }`. Put the types in `src/lib/assistant/types.ts`, **not** in `src/lib/types.ts`:
```ts
type AssistantAction =
  | { type: "navigate"; href: string; label: string }   // client calls router.push with nav-forward/back transitionTypes
  | { type: "simulate"; prompt: string }                  // opens /planner?q=…
  | { type: "fix_plan" }                                  // opens /planner and triggers Fix my plan (add ?fix=1; Claude will read it)
  | { type: "filter_transactions"; category?: string; q?: string } // /transactions?category=…&q=…
  | { type: "import_sample"; file: string }               // /import?sample=kosh-demo-statement.csv (Claude will read it)
  | { type: "theme"; value: "light" | "dark" }
  | { type: "open_palette" };
```
**Deterministic intent router first** (`src/lib/assistant/intents.ts`, no AI needed, works in English and Hinglish). Test every example below:

| Intent | Example inputs | Result |
|---|---|---|
| Navigate | "take me to recurring", "open my subscriptions", "show the monthly review", "go to what if", "where are my goals", "home", "settings / my data", "how does this work" | `navigate` to `/subscriptions`, `/report`, `/planner`, `/goals`, `/`, `/goals#your-data`, `/how-it-works` + a one-line reply |
| Filter | "show my dining transactions", "swiggy wale transactions dikhao", "what did I spend on uber" | `filter_transactions` + a short summary from the real data (count + total this month) |
| What-if | anything starting "what if", "can I afford", "agar main …" | run `parseScenario` + `simulateWithSummary` server-side, reply with the summary, `simulate` action ("Open in planner") |
| Fix plan | "fix my plan", "how do I get back on track", "goals kaise poore honge" | call the solver, reply with the explanation, `fix_plan` action |
| Import | "import a statement", "add my bank sms", "try the sample" | `navigate` /import (+ `import_sample` for "sample") |
| Explain a page | "what is this page", "help", "what can you do" | a page-aware help reply using `page` (one paragraph per route; write them from what each page actually does) + 3 suggestion chips |
| Theme | "dark mode", "light mode" | `theme` |
| Data/privacy | "is my data safe", "delete my data", "export my data" | an honest reply from `docs/SECURITY.md` facts + `navigate` /goals#your-data (never delete from chat) |
| Everything else | money questions | delegate to `coachReply()` (it already has guardrails, what-if tool use and grounded answers) |

- Guardrails always run first (`checkGuardrails`). A blocked question returns the guardrail reply with avatar state `concerned` and no actions.
- Return the avatar `mood` too: `happy` | `concerned` | `neutral` (from the result: goal on track or positive → happy; overspend, guardrail or infeasible → concerned).
- Rate limit 30/min per IP (use the existing `src/lib/rate-limit.ts`).
- **Suggested chips per page** (from `page`): `/` → "Where did my money go?", "Fix my plan", "Am I on track?"; `/transactions` → "Show dining", "What needs review?"; `/planner` → "What if rent goes up 3k?", "Fix my plan"; `/subscriptions` → "What can I cancel?"; `/report` → "Summarise my month"; `/import` → "Try the sample statement".

### A4. Tests
`tests/assistant.test.ts` (`npx tsx`): at least 30 utterances (English + Hinglish) mapped to the expected intent/action, the guardrail cases blocked, and unknown questions falling through to the coach. Print a pass/fail table.

---

## Part B: everything left before deploying the prototype

### B1. Correctness and polish
- Fix the lint error in `src/lib/rate-limit.ts` (`prefer-const`). `npx eslint src` must be clean.
- `src/app/not-found.tsx` and `src/app/error.tsx` / `global-error.tsx`: Kosh wordmark, a large heading ("This page wandered off" / "Something went wrong"), one primary button home, tokens only. `error.tsx` shows a generic message and never shows `error.message` in production.
- `GET /api/health` returns `{ ok: true, version, aiProvider, aiAvailable, passcodeRequired }`. No secrets.
- Make sure every route handler returns JSON errors (no HTML stack traces) and that malformed JSON bodies give 400.

### B2. Login and security, final pass (much is already done, so verify, don't rebuild)
- Confirm `KOSH_PASSCODE` unset → open demo; set → `/login` gate on every page and API; `/api/health` and static assets stay public.
- If not already done from Round 2 Part 3b: AES-256-GCM encryption at rest with `KOSH_DATA_KEY`, scrypt `KOSH_PASSCODE_HASH` support, 30-min idle sessions, Origin check (CSRF) on non-GET `/api/*`, 5 MB upload cap + magic-byte checks. Tick each off in `docs/SECURITY.md`.
- **Vercel realities:** the DB lives in `/tmp` per serverless instance, so data is ephemeral and can differ between instances. In-memory rate limits and lockouts are also per instance. Document this honestly in `docs/SECURITY.md` and `docs/DEPLOY.md` as a prototype limitation, with the production path: Vercel KV / Upstash Redis for sessions and limits, Postgres (Neon/Supabase) for data with row-level encryption.
- Cookies: `Secure` in production, `HttpOnly`, `SameSite=Lax`, `path=/`. Run `scripts/test-security.ts` against `next start` with a passcode set and paste the result into STATUS.

### B3. Deploy prep
- `docs/DEPLOY.md`: step by step for Vercel. Import the GitHub repo; framework Next.js; Node 22; env vars `AI_PROVIDER`, `GOOGLE_GENERATIVE_AI_API_KEY` (or `OPENAI_API_KEY`), `KOSH_PASSCODE` (optional for the judges' link: recommend leaving it unset on the public demo and setting it on a second "secure" deployment), `KOSH_SECRET`, `KOSH_DATA_KEY` (how to generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). Explain that `prebuild` copies `samples/` into `public/samples/`, so confirm the sample buttons work on the deployed URL.
- Ensure `npm run build` works on a clean clone (`rm -rf node_modules .next && npm ci && npm run build`). Pin `"engines": { "node": ">=22" }` in `package.json`.
- Add `metadataBase` (from `VERCEL_URL` / `NEXT_PUBLIC_SITE_URL`) so Open Graph works. Leave the visuals to Claude.
- README: add a "Deploy" section linking `docs/DEPLOY.md`, a "Security" section linking `docs/SECURITY.md`, the test commands, and the avatar credit/license.

### B4. Final verification (paste the results into `docs/STATUS.md` under "Round 3 (Codex)")
`npx eslint src` clean · `npx tsc --noEmit` clean · `npx tsx tests/brain.test.ts`, `tests/round2.test.ts`, `tests/assistant.test.ts`, `scripts/test-security.ts` all pass · `npm run build` green · manual smoke on `next start`: open the assistant on every page, run one navigate, one what-if, one fix-plan and one guardrail question, check the login gate with a passcode, and check that the browser console has no CSP errors.

Commit small (`round3: …`), `git pull --rebase` before every push. In `docs/STATUS.md`, list exactly what Claude needs to wire up: `?fix=1` on `/planner`, `?sample=` on `/import`, and `#your-data` on `/goals`.
