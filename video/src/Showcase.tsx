import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import story from "./story.json";
import { captionsFor } from "./captions";
import { Backdrop, Beat, Browser, C, Chaos, EndCard, Phones, SANS, SERIF, WrappedReel, XF } from "./parts";

type Scene = { id: string; chapter: string; title: string; seconds: number; voice: string; beats: Beat[] };
const SCENES = story.scenes as Scene[];
const FPS = story.fps;
const CUES = captionsFor(SCENES, FPS);

/** Chapter title: words rise one by one, hold, then clear for the product. */
const ChapterTitle: React.FC<{ scene: Scene }> = ({ scene }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hold = Math.round(2.6 * fps);
  if (f > hold + 15) return null;
  const out = interpolate(f, [hold, hold + 15], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lines = scene.title.split("\n");
  let wi = 0;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(90deg, ${C.bg}f2 0%, ${C.bg}c8 48%, transparent 78%)`, opacity: out, justifyContent: "center", padding: "0 140px" }}>
      {scene.chapter && <div style={{ fontFamily: SANS, fontSize: 26, letterSpacing: 2, color: C.gold, marginBottom: 26 }}>{scene.chapter}</div>}
      <div style={{ fontFamily: SERIF, fontSize: 108, lineHeight: 1.02, color: C.ivory, maxWidth: 1300 }}>
        {lines.map((line, li) => (
          <div key={li}>
            {line.split(" ").map((w, i) => {
              const p = spring({ frame: f - wi++ * 4, fps, config: { damping: 18 } });
              return (
                <span key={i} style={{ display: "inline-block", marginRight: 26, opacity: p, transform: `translateY(${(1 - p) * 50}px)`, filter: `blur(${(1 - p) * 8}px)` }}>
                  {w}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Burned-in captions (also exported as SRT by scripts/captions.mjs). */
const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const cue = CUES.find((c) => f >= c.from && f < c.to);
  if (!cue) return null;
  const p = interpolate(f, [cue.from, cue.from + 6], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 40 }}>
      <div style={{ maxWidth: 1450, textAlign: "center", padding: "12px 26px", borderRadius: 12, background: "#000000c0", color: "#fff", fontFamily: SANS, fontSize: 34, lineHeight: 1.35, opacity: p }}>{cue.text}</div>
    </AbsoluteFill>
  );
};

const SceneView: React.FC<{ scene: Scene }> = ({ scene }) => {
  let at = 0;
  return (
    <AbsoluteFill>
      {scene.beats.map((b, i) => {
        const frames = Math.round(b.seconds * FPS);
        const from = at;
        at += frames;
        const dur = frames + (i < scene.beats.length - 1 ? XF : 0);
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            {b.phones ? <Phones shots={b.phones} frames={dur} /> : b.wrapped ? <WrappedReel count={b.wrapped} frames={dur} /> : b.endcard ? <EndCard frames={dur} /> : <Browser beat={b} frames={dur} />}
            {b.chaos ? <Chaos frames={dur} /> : null}
          </Sequence>
        );
      })}
      <ChapterTitle scene={scene} />
    </AbsoluteFill>
  );
};

export const TOTAL_FRAMES = SCENES.reduce((s, x) => s + Math.round(x.seconds * FPS), 0);

export const Showcase: React.FC = () => {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Backdrop />
      {SCENES.map((s) => {
        const frames = Math.round(s.seconds * FPS);
        const from = at;
        at += frames;
        return (
          <Sequence key={s.id} from={from} durationInFrames={frames} name={s.id}>
            <SceneView scene={s} />
          </Sequence>
        );
      })}
      <Captions />
      {story.voiceover ? <Audio src={staticFile("voiceover.mp3")} /> : null}
      {story.music ? <Audio src={staticFile("music.mp3")} volume={0.12} /> : null}
    </AbsoluteFill>
  );
};
