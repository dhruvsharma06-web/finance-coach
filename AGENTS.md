# Kosh — agent rules (read fully before writing code)

Kosh is an AI personal-finance coach with a **living money model** for users in India, built for the
Product Space × Wispr Flow hackathon (problem 04). **Deadline: 31 Oct 2026, 11:59 PM IST.**
Three coding agents work in this repo at the same time. These rules keep us from breaking each other.

## Stack
- Next.js 16 (App Router, `cacheComponents: true`), React 19, TypeScript strict, Tailwind v4
- Persistence: JSON file DB in `src/lib/db.ts` (`./data/db.json` locally, `/tmp` on Vercel). Seeds itself from `src/lib/seed.ts`.
- AI: Vercel AI SDK via `src/lib/ai.ts` (`aiObject`, `aiText`, `aiAvailable`). Gemini by default, OpenAI optional.
- Charts: recharts. Icons: lucide-react. Toasts: sonner. Dates: date-fns. CSV: papaparse. PDF: unpdf.

## Lane ownership — only edit files in YOUR lane
| Lane | Agent | Owns |
|---|---|---|
| **A** | Claude | `src/app/**/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/components/**`, `src/lib/dashboard.ts`, `src/lib/client.ts`, shared contract files (below) |
| **B** | Codex #1 | `src/lib/ingest/**`, `src/lib/categorize/**`, `src/lib/recurring/**`, `src/app/api/{import,transactions,rules,recurring}/**`, `samples/**`, `scripts/**` |
| **C** | Codex #2 | `src/lib/simulate/**`, `src/lib/insights/**`, `src/lib/coach/**`, `src/app/api/{simulate,nudges,report,coach,profile}/**`, `tests/**` |

**Shared contract (Lane A owns, others may only ADD optional fields):** `src/lib/types.ts`, `src/lib/db.ts`,
`src/lib/ai.ts`, `src/lib/categories.ts`, `src/lib/format.ts`, `src/lib/seed.ts`, `src/lib/api.ts`.
If you add a field, append a line to `docs/CHANGELOG-CONTRACT.md`. Never rename or remove fields.
Never change an exported function signature in another lane's files — the UI depends on them.

## Hard rules
1. **Money math is deterministic code. The LLM never computes numbers** — it only parses, classifies, and writes prose from numbers we give it.
2. **Every AI call has a no-key fallback.** Check `aiAvailable()`; the app must fully demo with no API key.
3. **Guardrails:** the product never names or recommends specific securities, funds, stocks, crypto, or insurance products, and never promises returns. Use `COACH_GUARDRAILS` from `src/lib/ai.ts` in every user-facing prompt.
4. Indian context: ₹, lakh/crore formatting (`formatINR`, `formatINRCompact`), UPI, bank SMS, DD/MM dates.
5. All mutations go through `updateDb()`; reads through `readDb()`. Route handlers are wrapped in `handle()` from `src/lib/api.ts` (do NOT add `export const dynamic` — it breaks the build with cacheComponents).
6. Route handler `params` are a Promise: `ctx: { params: Promise<{ id: string }> }` → `const { id } = await ctx.params`.
7. Before every push: `npm run build` must pass. Do not commit `data/` or `.env*` (except `.env.example`).

## Git workflow
- Everyone works on `main` in their own files. Commit small, often.
- `git pull --rebase origin main` before every push. If a conflict touches another lane's file, take theirs.
- Commit messages: `lane-b: sms parser handles HDFC/ICICI/SBI formats`.

## Commands
- `npm run dev` → http://localhost:3000
- `npm run build` → must pass before push
- `POST /api/reset` → restore demo seed data
- Sample inputs: `samples/hdfc-november.csv`, `samples/sms-dump.txt`

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
