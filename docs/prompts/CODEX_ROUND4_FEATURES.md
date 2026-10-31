# Round 4: Family, Festivals, Monthly Wrapped, Splits (copy everything below the line into Codex)

---

You are adding 4 features to **Kosh** (https://github.com/dhruvsharma06-web/finance-coach), an AI money coach for India built on Next.js 16, TypeScript and Tailwind v4. Deadline: 31 Oct 2026, 11:59 PM IST. You own the whole codebase, UI included.

**Step 0:** `git pull`. Read `AGENTS.md`, `src/lib/types.ts`, `src/lib/db.ts`, `src/lib/seed.ts`, `src/lib/client.ts`, `src/lib/simulate/*`, `src/components/ui.tsx`, `src/components/money-flow.tsx`, `src/components/shell/app-shell.tsx`, `src/app/globals.css`. Next.js 16: never add `export const dynamic`; wrap handlers in `handle()`; read `node_modules/next/dist/docs/` before routing changes.

**Rules:**
- Money math is deterministic code; the LLM only writes words, with a no-key fallback.
- Add types as new optional fields on `Database` and log them in `docs/CHANGELOG-CONTRACT.md`. Bump the DB version, or make `load()` fill missing keys so old `db.json` files don't crash.
- Seed every feature with demo data for the persona "Aarav" in `seed.ts`, so nothing is ever empty.
- **Design:** keep the existing look. Use only the tokens in `globals.css` (`bg-surface`, `bg-ink`, `text-muted`, `bg-fill` marigold accent, `font-display` serif), the components in `ui.tsx` (`PageHeader`, `Panel`, `Button`, `Badge`, `Meter`), and the motion classes (`.reveal`, `.rise`, `<Words>`, `.grow-bar`, `.meter-fill`, `<CountUp>`). No gradients, purple, or emoji in the UI chrome. Big type (body ≥ 16px). Test light and dark mode at 1440px and 390px.
- Add each page to `NAV` in `app-shell.tsx`: after "Money model", in the order Family, Splits, Festivals. Add Wrapped as a button on Overview and Monthly review, plus its own route.
- After each feature: `npm run build` green, commit `round4: …`, `git pull --rebase`, push, one line in `docs/STATUS.md`.

## 1. Family (`/family`)
- **Types:** `Family { name; members: FamilyMember[] }`. `FamilyMember { id; name; relation; role: "earner"|"dependent"|"student"|"retired"; monthlyIncome; city?; supportReceived?: { fromMemberId; amount; day } [] ; shareDetails: boolean }`. `familyGoals: Goal & { contributions: Record<memberId, number> }[]`.
- **Seed:** Aarav (earner ₹95K, Bengaluru), Papa (earner ₹70K, Jaipur), Maa (dependent), Didi (earner ₹60K), Chhotu (student in Pune, gets ₹12K/month from Aarav and ₹8K from Papa), Dadi (retired, gets ₹10K from Papa). Shared goals: "Didi's wedding" ₹8L by Feb 2027 and "Parents' medical fund" ₹3L.
- **API:** `GET/PUT /api/family`, `POST /api/family/members`, `PATCH/DELETE /api/family/members/:id`, `GET /api/family/summary` → `{ totalIncome, earners, dependents, dependencyRatio, shareByEarner[], supportFlows[], monthlySupportTotal, goals[] with projected dates }`.
- **UI:**
  - Hero sentence: "6 people, 3 earning. ₹2.25L comes in; ₹30K goes out as support every month."
  - **Family money flow:** reuse `MoneyFlow`, with each earner as a stream into the household, and support flows to each dependent shown as streams out.
  - **"Who's carrying the house":** a stacked bar of each earner's share, with percentages that count up.
  - **Member cards:** role badge, income, support given or received, and a privacy toggle that shows totals only.
  - **Support tracker:** who sends what to whom and on which day, with "due in 3 days" badges.
  - **Shared goals:** a per-member contribution meter plus a projected date, computed deterministically from contributions.
  - **Family what-if** box with presets "What if Papa retires next year?", "What if Chhotu's fees go up ₹20K?" Reuse the `simulate` engine on the family totals, or write a small family projection.
  - **Add / edit member** form.

## 2. Splits, Splitwise-style (`/splits`)
- **Types:** `SplitGroup { id; name; members: { id; name }[] }`. `SplitExpense { id; groupId; description; amount; paidBy; date; split: { memberId; share }[]; mode: "equal"|"exact"|"percent" }`. `Settlement { from; to; amount; date }`.
- **Seed:** "Goa trip" (Aarav, Rohan, Priya, Kabir) with 6 expenses, and "Flat 4B" (Aarav plus 2 flatmates) with rent, Wi-Fi and groceries.
- **Logic:** balances per member, plus **minimum-transactions settle-up** (greedy: largest creditor paired with largest debtor). Unit-test it.
- **API:** CRUD for groups and expenses, `GET /api/splits/:groupId/balances` → `{ balances[], settleUp: { from, to, amount }[] }`, and `POST /api/splits/:groupId/settle`.
- **UI:**
  - A group list.
  - A group page with a big "You're owed ₹3,240" or "You owe ₹1,120" (count-up).
  - The expense list.
  - An add-expense sheet with equal, exact and percent modes, plus voice-friendly quick add: "Rohan paid 2400 for dinner, split equally".
  - A settle-up plan with animated arrows between people.
  - A "Copy UPI request" button that copies the text "Pay ₹840 to Aarav for Goa trip". Don't build real UPI deep links that move money.
  - When Aarav's share is marked paid, optionally add it as a transaction (category from the description).

## 3. Festivals (`/festivals`)
- **Data:** `src/lib/festivals.ts` with Indian festivals and dates for 2026–2027: Diwali (8 Nov 2026; 29 Oct 2027), Dhanteras, Bhai Dooj, Christmas, New Year, Holi (Mar 2027), Raksha Bandhan, Eid, Navratri/Durga Puja, Pongal/Sankranti, Onam, Ganesh Chaturthi, plus wedding season (Nov–Feb). Mark each by region.
- **Logic:** for each upcoming festival, estimate the spend from the last 45 days before the same festival in the history, or from a category baseline × festival multiplier (Diwali 2.2× shopping/gifts, and so on). Compute a "festival pot", the monthly amount to save from now until then, and the effect on goals via `simulate` (a `one_time` change in that month).
- **API:** `GET /api/festivals` → `{ upcoming: { name, date, daysLeft, estimatedSpend, potSaved, monthlyToSave, goalImpact }[] }`, and `POST /api/festivals/:id/pot { target }`.
- **UI:**
  - A big countdown for the next festival: "Diwali in 8 days. Expect about ₹18,500." A countdown number plus an animated diya/lamp motif drawn in SVG or CSS (no images needed).
  - A horizontal timeline of the next 12 months with festival markers that grow in.
  - Pot cards with a meter and "Set aside ₹X/month".
  - "Add to plan" sends `/planner?q=What if I spend ₹18,500 on Diwali in November?`
  - A nudge type `"festival"` 30 days before each festival (add it to `computeNudges`).

## 4. Monthly Wrapped (`/wrapped?month=YYYY-MM`)
- **API:** `GET /api/wrapped?month=` returns deterministic stats:
  - total in/out and savings rate
  - top category and top merchant, with count ("You ordered Swiggy 23 times")
  - biggest single spend, busiest day of the week, a late-night order count
  - subscriptions total
  - a learned-rules count
  - best category vs budget
  - goal progress this month
  - a fun "persona" label from the rules: "The Weekend Foodie", "The Steady Saver", "The Subscription Collector"

  The AI writes a one-line caption per card; use template captions without a key.
- **UI:** a full-screen, story-style experience like Spotify Wrapped. 8–10 cards with tap / arrow keys / swipe navigation, progress bars along the top, and auto-advance every 5 s (pause on hold).
  - Each card has its own motion: numbers counting up, bars growing, a big serif headline, and colour fields using the category colours.
  - A final summary card, with "Share" producing a PNG via an SVG/canvas snapshot of the card, downloaded locally.
  - Entry points: a button on Overview ("Your October, wrapped") and on Monthly review. Respect reduced motion. Close with Esc.

## 5. Wire it in, then test
- Command palette (`command-palette.tsx`) entries for all 4 features.
- Assistant intents (if `src/lib/assistant/intents.ts` exists): "show my family", "split dinner with Rohan", "when is Diwali", "show my wrapped".
- `tests/round4.test.ts` (`npx tsx`):
  - family summary maths
  - settle-up minimality (4-person case)
  - the festival pot amount
  - the wrapped stats against the seed
- All existing tests still pass, `npx eslint src` is clean, `npm run build` is green.
- Smoke-test every new page in light and dark mode, desktop and mobile, with no console errors.
- Update `README.md` with a 1-line description per feature.
- Finally, print a short summary of what was built and anything not finished.
