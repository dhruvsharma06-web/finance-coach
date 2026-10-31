// Writes out/kosh-showcase.srt from src/story.json using the same timing as the burned-in captions.
import { mkdirSync, readFileSync, writeFileSync } from "fs";

const story = JSON.parse(readFileSync("src/story.json", "utf8"));
const fps = story.fps;
const ts = (frame) => {
  const ms = Math.round((frame / fps) * 1000);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
const cues = [];
let at = 0;
for (const s of story.scenes) {
  const frames = Math.round(s.seconds * fps);
  const parts = s.voice.split("·").map((p) => p.trim()).filter(Boolean);
  const total = parts.reduce((n, p) => n + p.length, 0);
  const lead = Math.round(0.4 * fps);
  let t = at + lead;
  const usable = frames - lead - Math.round(0.3 * fps);
  for (const p of parts) {
    const len = Math.round((p.length / total) * usable);
    cues.push([t, t + len, p]);
    t += len;
  }
  at += frames;
}
mkdirSync("out", { recursive: true });
writeFileSync("out/kosh-showcase.srt", cues.map(([a, b, t], i) => `${i + 1}\n${ts(a)} --> ${ts(b)}\n${t}\n`).join("\n"));
writeFileSync("out/voiceover-script.txt", story.scenes.map((s) => `[${s.chapter || "Close"} · ${s.seconds}s]\n${s.voice.replace(/ · /g, " ")}\n`).join("\n"));
console.log(`Wrote ${cues.length} captions to out/kosh-showcase.srt and the script to out/voiceover-script.txt`);
