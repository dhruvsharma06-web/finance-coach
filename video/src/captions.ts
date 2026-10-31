/** Caption cues: each scene's voice line is split on "·" and spread over the scene by length. Shared by the render and the SRT export. */
export type Cue = { from: number; to: number; text: string };

export function captionsFor(scenes: { seconds: number; voice: string }[], fps: number): Cue[] {
  const cues: Cue[] = [];
  let at = 0;
  for (const s of scenes) {
    const frames = Math.round(s.seconds * fps);
    const parts = s.voice.split("·").map((p) => p.trim()).filter(Boolean);
    const total = parts.reduce((n, p) => n + p.length, 0);
    const lead = Math.round(0.4 * fps);
    let t = at + lead;
    const usable = frames - lead - Math.round(0.3 * fps);
    for (const p of parts) {
      const len = Math.round((p.length / total) * usable);
      cues.push({ from: t, to: t + len, text: p });
      t += len;
    }
    at += frames;
  }
  return cues;
}
