# Final Codex prompt (copy everything below the line)

---

You are now the only engineer on **Kosh** (repo: https://github.com/dhruvsharma06-web/finance-coach). Claude is offline, so you own the whole codebase, UI included. Deadline: tonight, 31 Oct 2026, 11:59 PM IST.

**Step 0:** `git pull`. Read `AGENTS.md`, `docs/STATUS.md`, `docs/PLAN.md`, `docs/SECURITY.md`, and **all of `docs/prompts/ROUND3_CODEX_ASSISTANT_AND_DEPLOY.md`**. That file is your main spec. Avatar repo: https://github.com/smontlouis/bible-strong-avatar-lab (AGPL-3.0; handle the licence exactly as Round 3 says). This is Next.js 16: check `node_modules/next/dist/docs/` before touching routing, config or proxy. Never add `export const dynamic`.

**Design rules (you now own the UI):** keep the existing look exactly. Use only the tokens in `src/app/globals.css` (`bg-bg`, `bg-surface`, `bg-ink`, `text-muted`, `bg-fill` marigold accent, `font-display` serif), the components in `src/components/ui.tsx`, and the motion classes `.reveal`, `.rise`, `.word` / `<Words>`, `.grow-bar`, `.meter-fill`. No gradients, glows, purple, or emoji. Big type: body ≥ 16px, headings ≥ 22px. Test light and dark mode, and 1440px and 390px widths.

## Do in this order. After each step: `npm run build` green, commit `final: …`, `git pull --rebase`, push, one line in `docs/STATUS.md`.
1. **Round 3, Part A:** the "Ask Kosh" avatar assistant that answers and navigates. Follow the spec. These deep links already work, so use them: `/planner?fix=1` (runs Fix my plan), `/planner?q=<what-if>`, `/import?sample=kosh-demo-statement.csv`, `/transactions?category=dining`, `/goals#your-data`, `/coach?q=<question>`. Mount `<Assistant />` in `src/components/shell/app-shell.tsx`, and hide it on `/login`.
2. **Round 3, Part B:** lint clean (fix `src/lib/rate-limit.ts` `prefer-const`), not-found and error pages, `/api/health`, the security final pass (encryption at rest, scrypt hash, idle sessions, CSRF Origin check, upload limits, if anything from Round 2 Part 3b is missing), `docs/DEPLOY.md`, README Deploy/Security/licence sections.
3. **Verify `/goals#your-data`** scrolls to the "Your data" section. Claude added a 500 ms delayed `scrollIntoView` in `src/components/views/goals.tsx` `YourData`; confirm it works or fix it.
4. **Full smoke test** on `npm run build && npm start`. Click every nav page; run import of all samples (`samples/*`), the EatClub learning-loop correction with Undo, a what-if, Fix my plan, a coach question, a guardrail question ("which stock should I buy?"), a life event ("my rent went up to 28k"), export, delete and restore demo, and Ctrl+K. Fix anything broken and keep the browser console free of errors.
5. **Deploy to Vercel:** import the repo, Node 22, env `AI_PROVIDER=google`, `GOOGLE_GENERATIVE_AI_API_KEY` (ask Dhruv for it), `KOSH_SECRET`, `KOSH_DATA_KEY`. Leave `KOSH_PASSCODE` unset on the public demo link. Optionally make a second deployment with a passcode to show the login. Test the live URL (sample buttons, coach, assistant) and put the URL in `README.md` and `docs/STATUS.md`.
6. **Tests stay green:** `npx tsx tests/brain.test.ts`, `tests/round2.test.ts`, `tests/assistant.test.ts`, `scripts/test-security.ts`, `npx tsc --noEmit`, `npx eslint src`.

When you're done, print a short summary for Dhruv: the live URL, what was built, anything not finished.
