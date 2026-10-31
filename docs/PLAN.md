# Kosh: game plan

**Problem 04: Personal finance coach with a living money model.** Deadline 31 Oct 2026, 11:59 PM IST.
Submission: GitHub repo + demo video. Deployed on Vercel. LinkedIn bonus is due 1 Nov, 11:59 PM IST.

## Scoring → what we do about it
| Criterion | % | Our play |
|---|---|---|
| Wispr Flow usage | 20 | Every prompt to every agent is dictated. Record 20–40 s clips throughout and keep `docs/WISPR_LOG.md`. The product is voice-native: voice what-ifs, voice quick-add ("spent 450 on Swiggy"), voice life events ("rent went up to 28k"). |
| Prototype quality & UX | 20 | Premium, cohesive UI. Seeded persona so nothing is ever empty. One flawless demo path. |
| AI integration | 20 | AI parses messy PDFs/SMS, categorizes unknowns, learns from corrections, turns plain English into scenarios, writes the review, coaches. **Deterministic math engine; AI never invents numbers.** |
| Problem understanding | 15 | Indian context (UPI, bank SMS, lakh/crore), the correction loop, "living" model via life events, honest "still using?" rather than fake usage detection. |
| LinkedIn | 15 (+10 bonus) | 3 posts: kickoff (now), mid-build GIF, final demo. Tag Product Space + Wispr Flow. |
| Innovation | 10 | The learning loop + voice-driven what-ifs + guardrails that still teach. |

## Lanes
- **A: Claude:** UI, design system, dashboard, integration. `docs/prompts/LANE_A_CLAUDE.md`
- **B: Codex #1 (Dhruv):** ingestion, categorization, learning loop, recurring. `docs/prompts/LANE_B_CODEX.md`
- **C: Codex #2 (friend):** simulation, nudges, monthly review, coach, guardrails, life events. `docs/prompts/LANE_C_CODEX.md`

## Timeline (IST)
| Time | Milestone |
|---|---|
| ~2:30 PM | Skeleton pushed. Lanes A + B start. LinkedIn post #1. |
| ~3:00 PM | Lane C starts. |
| 5:30 PM | **Checkpoint 1:** CSV + learning loop + projection engine + Overview/Transactions/Planner UI wired. |
| 8:00 PM | **Checkpoint 2:** all features wired. LinkedIn post #2 (GIF of the learning loop). Deploy to Vercel. |
| 8:00–9:30 PM | Bug bash on the deployed URL, polish, README screenshots. |
| 9:30–10:45 PM | Record the demo video (script below), edit in the Wispr clips. |
| 11:00 PM | Submit repo + video. LinkedIn post #3 with the video. |
| by 1 Nov 11:59 PM | Submit the LinkedIn link + engagement screenshot for the bonus. |

## Demo video script (~3 min)
1. **Hook (10 s):** "Budgeting apps sort your spending and stop. Kosh understands your goals and adapts when life changes, and we built it entirely by voice."
2. **Wispr montage (15 s):** clips of dictating prompts to Claude/Codex.
3. **Import (25 s):** drop the HDFC CSV, paste the SMS dump (spam ignored), drop the PDF. Everything is categorized.
4. **It learns (25 s):** fix EatClub → Dining. "Learned, applied to 5." Re-import November: auto-categorized.
5. **It notices (20 s):** Overview nudges: dining drift, Netflix +30%, "still using Hotstar?" → tap No.
6. **What-if by voice (35 s):** dictate "What if I cut dining out by 30% and my rent goes up 3k from January?" → chart + goal dates move.
7. **Living model (20 s):** dictate "Got a raise to 1.1 lakh from December" → profile updates, goals re-project.
8. **Coach + guardrails (20 s):** "Which stock should I buy?" → an educational refusal with a guardrail badge. "Can I afford a ₹60k phone in December?" → a simulation.
9. **Monthly review (15 s):** the one-page story.
10. **Close (10 s):** architecture slide (AI parses, code calculates) and the team.

## Env / deploy
- `.env.local`: `AI_PROVIDER=google`, `GOOGLE_GENERATIVE_AI_API_KEY=…` (free key from aistudio.google.com).
- Vercel: import the GitHub repo, add the same env vars, deploy. The DB lives in `/tmp` and reseeds itself per instance (fine for demo).
