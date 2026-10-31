# Kosh showcase video: fully automated

No screen recording needed. A script drives a real browser through the live app and captures every screen. Remotion then turns those captures into a 3:30 motion-graphics video with chapter titles, camera moves, callouts and captions. **You only add the voiceover.**

## One command
```bash
cd video
npm install                 # first time only
npx playwright install chromium   # first time only
npm run all                 # capture → captions → render
```
Output:
- `out/kosh-showcase.mp4`: 1920×1080, 30 fps, 3:30, burned-in captions
- `out/kosh-showcase.srt`: the same captions as a separate file
- `out/voiceover-script.txt`: the narration to read, scene by scene, with timings

## The pipeline
| Step | What happens | File |
|---|---|---|
| 1. Capture | Playwright opens the site at 1920×1080. It captures the landing page with its live 3D motion (hero, story chapters, all 5 memory-loop steps), then signs in through **Explore the demo**, resets the demo data, and captures 60+ screens: overview, import + result, the EatClub correction (picker → learned-rule toast), recurring, money model, what-if + Fix my plan, Family (+ "Papa retires"), Splits, Festivals, Coach (guardrail + affordability), Ask Kosh in Hinglish, monthly review, How it works, all 10 Wrapped cards, and 3 phone screens. It resets the demo again at the end. | `scripts/capture.mjs` |
| 2. Story | 8 scenes / 31 beats. Each beat = a screen + a camera move (`from`/`to` = scale, x, y) + optional callouts. The voiceover text and timing live here too. | `src/story.json` |
| 3. Motion | Floating 3D browser window with a tilt and a camera move inside it, gold callout pills, word-by-word chapter titles, a "scattered money" opening, a phone fan-out, a Wrapped page-turn reel, the end card. | `src/parts.tsx`, `src/Showcase.tsx` |
| 4. Captions | Each scene's voice line is split on `·` and timed by length, then burned in and exported as SRT. | `src/captions.ts`, `scripts/captions.mjs` |
| 5. Render | Remotion renders H.264 MP4 with its bundled ffmpeg. | `npm run render` |

Capture a local build instead of the live site with `KOSH_URL=http://localhost:3000 npm run capture`.

## Windows notes
- If Remotion can't download its own Chrome, point it at Playwright's: add `--browser-executable="%LOCALAPPDATA%\ms-playwright\chromium_headless_shell-1248\chrome-headless-shell-win64\chrome-headless-shell.exe"` to the render command.
- If rendering fails with `spawn …ffmpeg.exe ENOENT`, the folder path is longer than Windows allows. Clone the repo to a short path like `C:\kosh`, or map one temporarily with `subst K: <repo path>`, run from `K:\video`, then remove it with `subst K: /D`.

## Adding your voiceover
1. Read `out/voiceover-script.txt`. Each block shows the scene and how many seconds it gets.
2. Record it as one track, about 3:30 long. Save it as `video/public/voiceover.mp3`.
3. In `src/story.json`, set `"voiceover": true`. Optionally add royalty-free `public/music.mp3` and set `"music": true` (it plays at 12% volume).
4. Run `npm run render`.

To fine-tune the timing, change a scene's `seconds` (and its beats' `seconds`, which must add up to the scene). The captions follow automatically. Run `npm run studio` to scrub through the timeline live in the browser.

## Honesty
Every frame is the real app on the demo persona's data. There are no invented users, numbers or claims. The end card says "Educational guidance, not investment advice".
