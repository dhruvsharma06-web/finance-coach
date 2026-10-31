# Round 2 — "Fix my plan", unusual-spend alerts, Hinglish (Codex #2, friend's)

> Setup: `git clone https://github.com/dhruvsharma06-web/finance-coach.git && cd finance-coach && npm i`, then `npm run dev`.
> Paste everything below the line into Codex. Strongest model, high reasoning.

---

You are adding three features to **Kosh** (a personal-finance coach, Next.js 16, TypeScript) before tonight's deadline (31 Oct 2026, 11:59 PM IST). Read `AGENTS.md`, `src/lib/types.ts`, `src/lib/simulate/*` (the deterministic projection engine), `src/lib/insights/nudges.ts` and `tests/brain.test.ts` first. This is Next.js 16 with `cacheComponents`, so never add `export const dynamic`. Wrap route handlers in `handle()` from `src/lib/api.ts`.

**You own:** `src/lib/simulate/solve.ts`, `src/app/api/plan/fix/route.ts`, the "unusual" section of `src/lib/insights/nudges.ts`, the Hinglish additions in `src/lib/simulate/nl.ts` and `parse.ts`, and `tests/round2.test.ts`.
**Do not edit UI files.** Claude wires the UI. Add any new types as **optional** fields only, and log them in `docs/CHANGELOG-CONTRACT.md`.

## 1. "Fix my plan": the headline feature
`POST /api/plan/fix { goalId?: string }` → `{ changes: ScenarioChange[], result: SimulationResult, explanation: string, feasible: boolean }`

Find the **smallest, most realistic set of spending cuts** that puts every goal (or the given one) on track. Use the deterministic engine: call `simulate()` repeatedly. **The LLM never decides numbers.**
- Candidate levers: `category_pct` cuts on the variable categories in `buildBaseline().variableByCategory` (dining, shopping, entertainment, subscriptions, travel, transport, groceries), plus cancelling `possibly_unused` subscriptions (`category_abs` on subscriptions).
- Cost model: wants are cheaper to cut than needs. Weights: dining/shopping/entertainment/travel 1, subscriptions 0.8, transport 1.5, groceries 2. Cap each cut at 40% (groceries 15%).
- Search: greedy. Repeatedly add the 5% step with the best (goal-months-gained ÷ weighted ₹ cost) until every target goal is on track, or until every cap is reached. In that case return `feasible: false` with the best plan found, and an explanation that suggests an income or date change.
- Merge steps into one change per category. Round percentages to multiples of 5.
- `explanation`: a template, plus an `aiText` rewrite when `aiAvailable()` (use `COACH_GUARDRAILS`, numbers only from the result). Example: "Trim dining by 25% and shopping by 15% (about ₹4,700 a month) and all three goals land on time. Your emergency fund is the tightest: it finishes in June 2027, right on target."
- Must respond in under 1.5 s without AI (keep it to fewer than 400 simulate calls).

## 2. Unusual-spend alerts
In `computeNudges`, add type `"unusual"` (add `"unusual"` to `NudgeType` as an additive union member, and log it). Flag a debit in the latest month when it is ≥ 2.5× that merchant's median over prior months (with at least 2 prior transactions), or ≥ 3× the category's median single transaction and > ₹2,000.
- Copy: title "Unusual: ₹4,554 at Toit". Body: "That's about 3× what you usually spend there." Action: `{ label: "Review", href: "/transactions?q=Toit" }`.
- Dedupe per transaction id. At most 2 per month.

## 3. Hinglish & Indian phrasing in the parser
Extend `matchCategory` / `parseMoney` / `parseScenario` so these work without an AI key:
- "khana bahar 30% kam karu toh?" → dining −30
- "rent 3 hazaar badh gaya" → Rent +3000
- "salary 1.2 lakh ho gayi" → income_abs to 120000
- "shopping aadhi kar du" → shopping −50
- "₹50k ka phone le lu next month" → one_time 50000, startMonth 1
- Words: hazaar/hazar = 1,000; lakh/lac/L = 1,00,000; crore/cr; kam/ghata = reduce; badh/zyada = increase; aadha/aadhi = half; khana bahar/bahar khana/swiggy-zomato = dining; kapde = shopping; petrol = fuel; ola uber auto = transport.

## 4. Tests
`tests/round2.test.ts` (`npx tsx`), using `buildSeed()`:
- fix-my-plan returns `feasible: true` for the seed, with every goal `onTrackScenario`
- the solver never cuts groceries past 15%
- the unusual detector flags a planted 4× transaction and not normal ones
- all 5 Hinglish phrases parse correctly

`tests/brain.test.ts` must still pass. `npm run build` must pass. Push small commits (`round2: …`) and add 2–3 lines to `docs/STATUS.md` under "Round 2 features (Codex #2)", including the exact response shape of `/api/plan/fix`.
