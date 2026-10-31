# Landing diagram + showcase video (copy everything below the line)

---

You are continuing work on an existing, working project called Kosh. Complete the two tasks below. Conserve tokens: inspect the relevant files, make a focused plan, implement, verify once, and fix material issues. Avoid repeated research or unrelated changes.

## TIME CONSTRAINT (read first)
- **Hackathon deadline: 31 Oct 2026, 11:59 PM IST.** The app must be deployed on Vercel before then.
- **Task 1 is required for the deploy.** Hard time-box: **90 minutes**, including verification. If you are running out of time, ship a simpler but correct version of the sequence (steps 1–3 fully animated, steps 4–5 as a clean static state) rather than nothing. Never leave the landing page broken.
- **Task 2 (video) is NOT on the deploy path.** Start it only after Task 1 is merged, built and pushed. If time runs short, deliver the script, storyboard and editable project, and say exactly what is missing. Don't block the deploy on the video.
- Commit small, `git pull --rebase` before each push, and keep `npm run build` green at every push.

## PROJECT
Repository: C:\Users\ASUS\OneDrive\Documents\GitHub\finance-coach (GitHub: https://github.com/dhruvsharma06-web/finance-coach). **Run `git pull` first.** `main` now contains everyone's work, including the merged landing page.

Kosh is an AI personal-finance coach for India. Its core idea is a **living money model**: imported transactions, learned categories, recurring expenses, income, family support and goals stay connected, so users can understand decisions before making them.

Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Three.js. Read `AGENTS.md`, `docs/STATUS.md` and the relevant installed skills before editing. My authorization covers the landing-page changes requested here. Preserve all other work and the existing authentication/dashboard flow.

## CURRENT IMPLEMENTATION
- `/` = public landing page. `/login` = passcode sign-in, or the explicitly labelled shared demo ("Explore the demo"). `/dashboard` = the overview. All app pages are gated by `src/proxy.ts`.
- Landing files: `src/components/landing/landing.tsx` and `landing.css`. 3D engine: `money-universe.tsx`. Goal models: `goal-world.ts`. Free ThreeUI adaptation: `threeui-orbital.ts` (MIT attribution, keep it).
- Existing visuals: a wallet, coins, transaction panels, an orbital particle field, a home, an emergency vault and an airplane. The scroll story has three chapters with clickable navigation.
- Landing palette: deep green/charcoal, warm gold, muted teal, ivory text. Fonts: Instrument Serif and Geist. The app itself uses ink/paper + marigold.
- The project's Turbopack CSS loader emits global CSS. Keep landing styles namespaced, and don't change the global loader.

## WHAT THE APP REALLY DOES (the only features you may show or claim)
1. **Import anything:** bank CSV (any layout), PDF statements (text and scanned fallback), pasted bank/UPI SMS with OTP and promo spam ignored. Duplicate-safe. A 6-month sample is at `samples/kosh-demo-statement.csv`.
2. **Learning loop:** rules → 60+ Indian merchants → AI. Correct one transaction, and Kosh writes a reusable rule, applies it to similar past transactions (with Undo), and uses it on future imports.
3. **Recurring:** cadence detection, price-hike alerts (e.g. Netflix ₹499 → ₹649), "still using it?" for possibly unused subscriptions, and a month-of-autopay strip.
4. **Living money model:** income, fixed costs, emergency fund and dated goals. Life events in plain words ("my rent went up to 28k") update it.
5. **What-if planner:** plain English and **Hinglish** ("khana bahar 30% kam karu toh?") become structured changes. A deterministic 36-month engine shows savings and goal dates. **Fix my plan** finds the smallest realistic spending cuts that put every goal on time.
6. **Coach + nudges + monthly review:** grounded in the user's numbers. Guardrails refuse specific stock/fund/crypto picks and still teach the concept. Nudges cover drift, price changes, unused and unusual spends, goals at risk and positives.
7. **USPs added today:**
   - **Family money** (`/family`): household money flow, "who's carrying the house" earner shares, a support tracker for non-earning members, shared goals with per-member contributions, family what-ifs ("What if Papa retires?"), and a per-member privacy toggle.
   - **Splits** (`/splits`), Splitwise-style: equal/exact/% splits, the fewest payments to settle up, a copy-request message. It **never moves money**.
   - **Festival planner** (`/festivals`): a Diwali countdown with an animated diya, a year timeline, festival pots with a monthly save target and the impact on goals.
   - **Monthly Wrapped** (`/wrapped`): full-screen story cards and a persona card, saved as an image.
   - **Ask Kosh**: an avatar assistant that answers and navigates the app, in English and Hinglish.
   - **Privacy:** masked account numbers, statements never stored, optional passcode, export/delete my data, AES-256-GCM storage support.
8. **Design rule for every claim:** AI reads and explains; deterministic code computes every rupee. Kosh is educational, has no bank login or autonomous bank access, and never recommends products or promises returns.

## DESIGN REFERENCES
https://elites-ivory.vercel.app/ · https://agribot-tech.vercel.app/ · https://idr-tech.vercel.app/ · https://threeui.com/landing-pages?sort=popular
Use free/open-source components only, and retain the required licences. Use the installed design skills for craft, but my explicit preference for rich 3D visuals overrides their aesthetic restrictions.

---

## TASK 1: REPLACE THE "A money model. With a memory." DIAGRAM (time-box 90 min)
The current diagram is too simple: statements/SMS → a central rectangle → three output boxes. Replace it with a professional, meaningful 3D explanation of how Kosh remembers and connects information.

Build it as a scroll-driven sequence:
1. **Inputs:** recognisable statement pages, bank SMS/UPI transactions and recurring-payment objects arrive.
2. **Understanding:** the transactions organise into categories and recurring costs.
3. **Memory:** one category correction ("EatClub → Dining") becomes a reusable rule, and a later similar transaction follows that rule. Make the learning feedback loop explicit.
4. **Living model:** income, expenses, family support, available savings and goals connect.
5. **Outcomes:** the same model powers goals, what-if planning (including Fix my plan), festivals and coaching. Show one adjustment propagating through those connections, e.g. "cut dining 30%" moving a goal date.

Requirements:
- Use real dimensional objects, readable labels, animated paths and purposeful camera movement. No floating rectangles or decorative planets.
- Match the surrounding landing page. Keep copy concise, label illustrative values as illustrative, and keep the money arithmetic deterministic.
- Don't claim autonomous bank access, guaranteed outcomes, or features the app doesn't implement.
- Keep mobile readable, keyboard controls usable, and reduced motion functional (static key frames).
- Reuse `money-universe.tsx` infrastructure where sensible. Keep 60 fps on a mid laptop: pause rendering off-screen and cap the pixel ratio at 2.
- Optionally add a compact "New in Kosh" strip after the diagram (Family · Splits · Festivals · Wrapped · Ask Kosh), each linking into the demo.
- Verify the section rendered on desktop (1440) and mobile (390), then run `npm run build`, push, and redeploy on Vercel.

---

## TASK 2: 3–4 MINUTE NARRATED PROJECT SHOWCASE (after the deploy; don't block on it)
Motion reference supplied by me: `C:\Users\ASUS\Videos\Screen Recordings\Screen Recording 2026-10-13 200532.mp4`
Inspect it before choosing the choreography, and extract representative frames if needed. Identify its camera movement, object transitions, pacing and how the narration relates to the visuals. Don't pretend to have viewed it if access fails.

Create a polished showcase, target length 3:30, combining:
- custom 3D explanatory animation
- genuine captures of the working Kosh app, from the deployed URL with the demo login
- a clear English voiceover
- readable captions
- restrained background music and subtle sound effects

Use an available video workflow, preferably Remotion if it suits, and read its installed skills. Verify rendering and voice-generation capabilities early. Never substitute silent output while claiming narration is complete.

**STORYBOARD (updated with the new USPs)**

| Time | Scene |
|---|---|
| 0:00–0:20 | **Problem:** a salary arrives, but money is scattered across UPI, statements, subscriptions, family support and everyday spending. Show the confusion visually. |
| 0:20–0:40 | **Introduce Kosh:** reveal the wallet and the connected money model. Recording spending is not the same as understanding how it affects future choices. |
| 0:40–1:10 | **Import and learn:** real CSV/PDF/SMS import, categorisation, one correction becoming a rule, then the learning loop on the next import. |
| 1:10–1:30 | **Understand the month:** the money-flow graphic, recurring costs (the Netflix hike), income vs costs vs money for goals. |
| 1:30–2:00 | **Explore a decision:** one concrete what-if in the real planner, then Fix my plan. Use its computed results, and animate the goal date moving. |
| 2:00–2:40 | **Life in India (USPs):** Family money (who carries the house, support to Chhotu), Splits settling the Goa trip in the fewest payments, the Diwali countdown and festival pot. About 12 seconds each. |
| 2:40–3:05 | **Coach and review:** Ask Kosh navigating by voice (Hinglish), a guardrail refusal that still teaches, nudges, the monthly review, a flash of Monthly Wrapped. AI interprets and explains; deterministic code computes. |
| 3:05–3:30 | **Close:** return to the 3D goal models. Summarise import → understand → simulate → act. End with Kosh's name, the live URL, "Built entirely by voice with Wispr Flow", and an invitation to explore. |

**VOICE AND MOTION**
- Write about 430–480 words, then adjust to the actual narration duration. Use a warm, confident Indian-English delivery with natural pauses and correct rupee/lakh pronunciation.
- Match camera transitions to the spoken ideas: smooth tracking, controlled orbits, close-ups, object assembly, visual connections. Let the viewer understand each scene before moving on. No rapid spinning, excessive particles, unreadable UI, or static slides with zoom effects.
- Show genuine product behaviour only. Don't invent testimonials, adoption figures, partnerships, financial results or unsupported security claims. Kosh provides educational guidance and doesn't recommend specific financial products or promise returns.

**DELIVERABLES**
- Implemented and verified diagram redesign (Task 1), deployed
- Final storyboard and voiceover script
- Editable video project and assets
- A narrated 1920×1080 MP4 at 30 fps, between 3 and 4 minutes
- Captions (SRT)
- Brief validation notes and asset/licence notes

If a capability blocks the final render or the narration, finish the editable project and state the exact missing requirement. Don't call an unfinished video complete.
