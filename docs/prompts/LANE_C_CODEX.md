# Lane C — Brain: What-if engine, Nudges, Monthly Review, Coach + Guardrails (Codex #2, friend's)

> Paste everything below the line into Codex. Model: strongest Codex model, **high** reasoning.
> Setup first: `git clone https://github.com/dhruvsharma06-web/finance-coach.git && cd finance-coach && npm i`,
> copy `.env.example` → `.env.local`, and add the shared AI key.

---

You are Lane C on a 3-agent hackathon team building **Kosh**, an AI personal-finance coach with a "living money model" for Indian users. Deadline is **tonight, 31 Oct 2026, 11:59 PM IST**, so ship working increments every 45–60 minutes and push each one.

## 0. First, read these (do not skip)
1. `AGENTS.md`: lane ownership, hard rules, git workflow. **You only edit files in Lane C.**
2. `src/lib/types.ts`: the shared contract. Focus on `FinancialProfile`, `Goal`, `Scenario`, `ScenarioChange`, `SimulationResult`, `GoalOutcome`, `Nudge`, `MonthlyReport`, `CoachMessage`, `GuardrailInfo`.
3. `src/lib/ai.ts` (`aiObject`, `aiText`, `aiAvailable`, `COACH_GUARDRAILS`), `src/lib/db.ts`, `src/lib/format.ts`, `src/lib/categories.ts`, `src/lib/seed.ts` (understand the demo persona "Aarav" and the planted story).
4. The stubs you are replacing: `src/lib/simulate/*`, `src/lib/insights/*`, `src/lib/coach/*`.
5. `node_modules/next/dist/docs/` before touching route handlers. This is Next.js 16 with `cacheComponents`. Never add `export const dynamic`.

## 1. What you own
```
src/lib/simulate/index.ts     deterministic projection engine (no LLM math)
src/lib/simulate/parse.ts     natural language → Scenario (LLM + regex fallback)
src/lib/simulate/baseline.ts  (new) build the "money model" baseline from profile + transactions
src/lib/insights/nudges.ts    drift / subscription / goal / buffer nudges
src/lib/insights/report.ts    monthly review (numbers + AI narrative)
src/lib/coach/index.ts        coach chat with money-model context + what-if tool use
src/lib/coach/guardrails.ts   input + output guardrails
src/app/api/{simulate,nudges,report,coach,profile}/**
tests/**                      guardrail red-team + simulation tests (tsx scripts)
```
**Do not edit** UI files, Lane B files (`ingest/`, `categorize/`, `recurring/`), or `src/lib/types.ts` (you may only ADD optional fields, and must log them in `docs/CHANGELOG-CONTRACT.md`).
Keep these **exported signatures** unchanged, because the UI and Lane B call them:
- `simulate(profile, transactions, scenario, horizonMonths?)` → `SimulationResult` (sync, pure)
- `parseScenario(prompt)` → `Promise<Scenario>`
- `generateNudges()` → `Promise<Nudge[]>` (new ones only; called by Lane B after every import)
- `buildMonthlyReport(month)` → `Promise<MonthlyReport>`
- `coachReply(messages)` → `Promise<CoachMessage>`
- `checkGuardrails(text)` → `GuardrailInfo`

## 2. Why this matters (judging)
Judges score **AI integration 20%**, **problem understanding 15%**, **innovation 10%**, plus UX. Your lane is the "coach" that makes this more than a budgeting app. The demo moments that depend on you:
1. **Voice what-if.** The user says (via Wispr Flow) *"What if I cut dining out by 30% and my rent goes up by 3,000 from January?"* → a parsed scenario chip list → a chart of baseline vs scenario → "Your Goa trip moves from **not reachable** to **on track by 14 Dec**; your emergency fund completes **2 months sooner**."
2. **Nudges that feel human.** "Dining is running 40% ahead of plan with 9 days left. Mostly late-night Swiggy."
3. **Monthly review**, a beautiful one-page story of the month with wins, watch-outs, and the narrative.
4. **Guardrails on stage.** "Should I buy Tata Motors shares?" → a warm, educational refusal that explains diversification and index funds *as concepts*, offers to model "investing ₹5,000/month more", and shows a visible "Guardrail" badge in the UI.

## 3. Detailed requirements

### 3.1 The living money model: baseline (`simulate/baseline.ts`)
`buildBaseline(profile, transactions)` returns:
- `monthlyIncome`: `profile.monthlyIncome` (if 0, use the median monthly credits in the income category).
- `fixedCosts`: sum of `profile.fixedCosts` (rent, EMI, utilities, SIP).
- `variableByCategory`: per spend category, the average over the **last 3 complete months** that have data (use the latest month with data as "current"; don't use the wall clock, because seed data ends Oct 2026). Exclude categories already covered by fixed costs (rent, emi, investments, utilities) to avoid double counting.
- `monthlySurplus` = income − fixed − Σvariable. Note that SIP (investments) is a fixed outflow but counts as savings. Expose both `cashSurplus` and `totalSavings = cashSurplus + SIP`.
- `emergencyFundMonths` = emergencyFund.current ÷ (fixed + variable, excluding investments).

### 3.2 Projection engine (`simulate/index.ts`): pure, deterministic, unit-tested
- Month 0 = the month after the latest data month. Horizon default 12 (max 36).
- For each month: income and spend after applying every `ScenarioChange` active from its `startMonth`:
  - `category_pct`: variable[category] × (1 + value/100)
  - `category_abs`: variable[category] + value
  - `income_pct` / `income_abs`
  - `fixed_cost_abs`: find the fixed cost by `label` (case-insensitive, fuzzy: "rent" matches "Rent") and add value; if not found, add it as a new fixed cost
  - `one_time`: only in `startMonth` (positive = expense, negative = windfall)
  - `new_recurring`: + value every month from `startMonth`
- **Goal funding:** savings flow first to the emergency fund until it reaches `targetMonths × monthly expenses` (if the EF goal exists), then to the other goals by priority (high → low), each goal starting from `currentAmount`. Record the month each goal reaches its target → `baselineReachDate` / `scenarioReachDate` (last day of that month, `YYYY-MM-DD`) or null if not reached within the horizon. `onTrack*` = reach date ≤ `targetDate`. `monthsDelta` = scenario − baseline in months (negative = sooner).
- `monthlySavingsDelta` = average monthly savings difference.
- `summary`: if `aiAvailable()`, `aiText` with `COACH_GUARDRAILS` and ONLY the computed numbers (pass a JSON of results) → 2–3 sentences, concrete, ₹ formatted with `formatINR`. **The model must not compute new numbers.** Otherwise use a template, e.g. "Cutting dining by 30% frees about ₹1,900/month. Your Goa trip moves from Feb to Dec (on track), and your emergency fund completes 1 month sooner."
  - Note: `simulate()` is sync. Make the summary async in a wrapper: add `simulateWithSummary()` used by the route, and keep `simulate()` pure, returning a template summary.
- `assumptions`: list them honestly ("Variable spending = Aug–Oct average", "No investment returns assumed", "Salary unchanged unless specified").
- Guardrail: values are clamped to sane ranges (pct −100..+300) and the horizon to ≤36.

### 3.3 NL → Scenario (`simulate/parse.ts`)
- With AI: `aiObject` with a zod schema mirroring `ScenarioChange[]` + `name` (a short 3–6 word title). The system prompt includes the `CATEGORY_IDS` with labels, the user's fixed-cost labels (from the profile), today's month, and examples:
  - "cut dining out by 30%" → `category_pct dining -30`
  - "what if my rent goes up" (no amount) → `fixed_cost_abs Rent +10% of current rent` and set `assumptions` to say so
  - "rent goes up by 3k from January" → `fixed_cost_abs Rent +3000, startMonth` = months until Jan
  - "I get a 15% raise in April" → `income_pct +15, startMonth`
  - "I buy a ₹60,000 phone next month" → `one_time +60000, startMonth 1`
  - "I add a ₹999 gym membership" → `new_recurring +999`
  - Multiple changes in one sentence → multiple items.
- Without AI: regex fallback covering at least the 6 examples above, including "k"/"lakh" amounts ("3k" = 3000, "1.2 lakh" = 120000) and month names → startMonth.
- If nothing parses, return `changes: []` and the route returns a friendly 422 with suggestions (`{ error, suggestions: string[] }`).

### 3.4 Nudges (`insights/nudges.ts`)
Called after every import and on `GET /api/nudges`. Use the latest data month as "now" (the seed ends 31 Oct). Generate:
- `overspend_pace`: for each budgeted category, `paceRatio = spent ÷ (budget × fractionOfMonthElapsed)`. >1.15 → warning, >1.4 → critical. The body names the top 1–2 merchants driving it and the ₹ over.
- `price_change`: for each `db.recurring` with `priceChange` → "Netflix went up 30% (₹499 → ₹649), ₹1,800 more a year."
- `unused_subscription`: `status === "possibly_unused"` → "Still using Disney+ Hotstar? ₹3,588/year."
- `new_subscription`: recurring first seen in the last 45 days.
- `goal_at_risk`: run `simulate()` with an empty scenario. Any goal with `onTrackBaseline === false` → with the action "Try a what-if" linking to `/planner?q=<url-encoded suggestion>`.
- `low_buffer`: emergency fund < 3 months of expenses.
- `positive`: a category ≥20% under budget with ≥70% of the month elapsed, or the savings rate up vs last month. **Always try to include at least one positive nudge.** Coaches encourage.
- **Dedupe:** key = `type + related id/category + month`. Don't recreate a nudge that exists (dismissed or not) for the same key. Persist with `updateDb`. Return only the new ones.
- Every nudge gets an `action` with a real `href` (`/subscriptions`, `/planner?q=…`, `/transactions?category=dining`, `/goals`).
- Copy style: short title (≤6 words), body ≤2 sentences, specific ₹ numbers, no shaming.

### 3.5 Monthly review (`insights/report.ts`)
- Deterministic numbers: totals, savingsRate, `byCategory` (with budget and `changePct` vs the previous month), top 5 merchants, `recurringTotal`, `goalsProgress` (pct + onTrack from the baseline simulation).
- With AI: ONE `aiObject` call with `COACH_GUARDRAILS` + the computed JSON → `{ wins: string[3], watchouts: string[3], narrative: string }`. Narrative: 2–3 short paragraphs, second person, warm, specific, ending with one concrete suggestion for next month (behavioural, not product-based). Without AI: templated wins and watch-outs from the numbers.
- Cache in `db.reports` by month and regenerate if transactions changed (store a hash of the count + sum).
- `GET /api/report?month=YYYY-MM` (exists). Add `GET /api/report/months` → the list of months with data, for the month picker.

### 3.6 Coach chat (`coach/index.ts`)
- **Pre-check:** `checkGuardrails(lastUserMessage)`. If triggered → return an educational reply (with AI: generate it with `COACH_GUARDRAILS` and explicitly instruct "do not name any product"; without AI: a template per reason) with `guardrail: { triggered: true, reason }`.
- **Intent:** if the message is a what-if ("what if", "can I afford", "if I cut/spend/buy/get a raise", "how long until"), call `parseScenario` and `simulate`, attach `simulation` to the reply, and have the AI explain the result in 2–4 sentences using only those numbers.
- **Otherwise:** answer with `aiText`, with the system prompt = `COACH_GUARDRAILS` + a compact "money model" context: profile (income, fixed costs, EF, goals), baseline (3-month category averages), recurring list, active nudges, the last month's top merchants. Keep it under ~2k tokens. Use the user's name (Aarav).
- **Post-check:** scan the output for tickers and fund/stock names (regex on common patterns like "NIFTY BEES", "… Mutual Fund … Direct Growth", known stock names, "₹… guaranteed", "returns of x%"). If found → regenerate once with a stricter instruction, else redact the sentence and set `guardrail: { triggered: true, reason: "output_filtered" }`.
- Without AI: a helpful template answer using the numbers (top category, savings rate, next goal) so the demo never dead-ends.
- Keep it non-streaming (the UI expects one JSON `CoachMessage`). Must respond in under 8 s.

### 3.7 Guardrails (`coach/guardrails.ts`) plus the red-team suite
- Expand the patterns: specific securities (stocks, named companies plus "shares", mutual-fund scheme names, ETFs, crypto coins, IPOs, F&O/options tips, "multibagger"), guaranteed returns, tax evasion, insurance product picks, loan app recommendations, "where should I invest my ₹X" (→ educate on asset-allocation concepts, no products).
- **Allowed** (must NOT trigger): "what is an index fund?", "how does a SIP work?", "should I build an emergency fund first?", "explain diversification", "how much should I save each month?".
- `tests/guardrails.test.ts` (run with `npx tsx`): 15 should-block prompts and 10 should-allow prompts. Print a pass/fail table and exit non-zero on failure.
- `tests/simulate.test.ts`: (a) an empty scenario equals the baseline; (b) cutting dining by 30% increases savings by exactly 30% of the dining average; (c) a rent +3000 from month 3 changes only months ≥3; (d) goal reach dates move in the right direction.

### 3.8 Profile API
`GET/PUT /api/profile` exists. Add:
- `POST /api/profile/goals` (create), `PATCH /api/profile/goals/:id`, `DELETE /api/profile/goals/:id`.
- `POST /api/profile/life-event { description }`: the living part of the model. With AI, parse "my rent went up to 28k from November" / "got a raise to 1.1 lakh" / "started a ₹2,000 SIP" into profile mutations (fixedCosts / monthlyIncome / budgets), apply them, append to `lifeEvents`, regenerate nudges, and return `{ profile, changes: string[] }` (human-readable diff, e.g. "Rent ₹25,000 → ₹28,000"). Regex fallback for rent/salary. **This is a great voice demo, so make it solid.**

## 4. Quality bar
- `simulate()` is pure and synchronous, with no db access inside. Easy to test.
- Every AI call is wrapped in try/catch, has a fallback, and has a timeout (`AbortSignal.timeout(15000)`).
- Use `formatINR` / `formatINRCompact` everywhere in user-facing text.
- `npm run build` passes before every push.

## 5. Order of work (push after each)
1. Baseline + projection engine + goal funding + `tests/simulate.test.ts`. **Push. (~60 min)** ← the UI's planner depends on this
2. NL → scenario parser (AI + regex fallback) + the 422 suggestions. **Push.**
3. Nudges (all types, dedupe, actions). **Push.**
4. Guardrails + the red-team test. **Push.**
5. Coach chat (context, what-if tool use, post-check). **Push.**
6. Monthly report + months endpoint. **Push.**
7. Life-event endpoint + goals CRUD. **Push.**

After each push, add 2–3 lines to `docs/STATUS.md` under "Lane C": what works, any response-shape additions, and known gaps. Lane A reads this to wire up the UI.

## 6. Done means
- `npx tsx tests/simulate.test.ts` and `npx tsx tests/guardrails.test.ts` pass.
- `POST /api/simulate {"prompt":"what if I cut dining out by 30% and rent goes up by 3000 from January"}` returns 2 changes, real goal dates, and a sensible summary, both with and without an AI key.
- `GET /api/nudges` on fresh seed data returns overspend (dining), price change (Netflix), unused (Hotstar), at least one goal or buffer nudge, and at least one positive nudge, with no duplicates on repeat calls.
- `POST /api/coach` with "Which stock should I buy?" triggers the guardrail. "Can I afford a ₹60k phone in December?" returns a simulation.
- `npm run build` is green and everything is pushed to `main`.
