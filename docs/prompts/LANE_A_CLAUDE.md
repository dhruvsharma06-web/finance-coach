# Lane A — Product UI, design system, integration (Claude)

Claude (Opus, high effort) owns the entire user-facing product and the shared contract.

## Owns
`src/app/**/page.tsx`, `layout.tsx`, `globals.css`, `src/components/**`, `src/lib/dashboard.ts`, `src/lib/client.ts`, and the contract files listed in AGENTS.md.

## Design direction
Calm, premium, trustworthy fintech. Warm off-white canvas, ink text, a deep-emerald accent, generous whitespace, tabular numerals, restrained motion. Light and dark themes. It should feel like a product and not a hackathon template: no gradient blobs, no emoji UI, no default shadcn look. Each screen has one primary action.

## Screens (in priority order for the demo)
1. **Overview** (`/`): month hero (spent / income / saved, savings rate), top nudges as cards with actions, category budget-pace bars, daily spend sparkline, upcoming recurring, goal progress rings, and an "Ask Kosh" voice/text bar that routes to the coach or planner.
2. **Transactions** (`/transactions`): fast table with search/filter, category chip that opens a picker inline. On change: "Learned: EatClub Brands → Dining · applied to 5 similar" toast with undo. Badges for source (CSV/PDF/SMS/voice) and categorySource (Rule / AI / Needs review). Rules drawer listing learned rules.
3. **Import** (`/import`): drag-drop zone (CSV/PDF), "Paste SMS" textarea, sample-file buttons, and an animated result summary (parsed / added / duplicates / warnings / new nudges) → CTA to review.
4. **What-if Planner** (`/planner`): a big natural-language prompt box ("Speak or type a what-if…", Wispr-friendly), parsed change chips that are editable, quick sliders per category, a baseline vs scenario area chart, and goal outcome cards showing date shifts. Reads `?q=` from nudges.
5. **Recurring** (`/subscriptions`): monthly committed total, cards for each recurring with cadence and next date, a price-change badge, and a "Still using?" Yes/No prompt.
6. **Coach** (`/coach`): chat with suggested prompts, inline simulation charts, a visible guardrail badge, mic hint.
7. **Profile & Goals** (`/goals`): income, fixed costs, emergency fund meter, goals with target dates, and a "Tell Kosh what changed" life-event box (voice-friendly).
8. **Monthly Review** (`/report`): an editorial one-page report with totals, category deltas, wins / watch-outs, narrative, and print/export.

## Integration duties
- Track `docs/STATUS.md` and wire up new endpoints and fields as Lanes B and C land them.
- Keep `npm run build` green on `main` and do final polish, empty/loading/error states, and mobile layout.
