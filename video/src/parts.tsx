import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadSans } from "@remotion/google-fonts/Geist";

const serif = loadSerif();
const sans = loadSans();

/* Palette matches the Kosh landing page: deep green/charcoal, warm gold, teal, ivory. */
export const C = { bg: "#0b1411", deep: "#14271f", gold: "#efbc6a", teal: "#7fd1b0", ivory: "#f0e7d4", muted: "#9db1a4" };
export const SERIF = `${serif.fontFamily}, Georgia, serif`;
export const SANS = `${sans.fontFamily}, system-ui, sans-serif`;
export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const XF = 18; // cross-fade frames between beats

export type Cam = [number, number, number];
export type Callout = { text: string; x: number; y: number; at: number };
export type Beat = {
  shot?: string;
  seconds: number;
  from?: Cam;
  to?: Cam;
  callouts?: Callout[];
  chaos?: boolean;
  phones?: string[];
  wrapped?: number;
  endcard?: boolean;
};

/** Slow drifting backdrop with two orbit rings. Restrained, never busy. */
export const Backdrop: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at ${60 + Math.sin(f / 300) * 8}% ${50 + Math.cos(f / 260) * 6}%, ${C.deep}, ${C.bg} 70%)` }}>
      <svg width="1920" height="1080" style={{ position: "absolute", opacity: 0.32 }}>
        <ellipse cx="1500" cy="540" rx="520" ry="160" fill="none" stroke={C.gold} strokeWidth="1.2" transform={`rotate(${-18 + f * 0.02} 1500 540)`} />
        <ellipse cx="1500" cy="540" rx="430" ry="120" fill="none" stroke={C.teal} strokeWidth="1" transform={`rotate(${24 - f * 0.015} 1500 540)`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Gold pill that pops in at `at` seconds with a pulsing dot. */
export const CalloutTag: React.FC<{ c: Callout; frames: number }> = ({ c, frames }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = Math.round(c.at * fps);
  if (f < start) return null;
  const p = spring({ frame: f - start, fps, config: { damping: 14, stiffness: 120 } });
  const out = interpolate(f, [frames - XF - 6, frames - XF + 6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 160 + c.x * 1600, top: 90 + c.y * 900, transform: `translate(-50%, -50%) scale(${0.7 + p * 0.3})`, opacity: p * out, display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ width: 16, height: 16, borderRadius: 8, background: C.gold, boxShadow: `0 0 0 ${6 + Math.sin(f / 6) * 4}px ${C.gold}40` }} />
      <span style={{ padding: "12px 22px", borderRadius: 999, background: "linear-gradient(135deg,#ffdea3,#d9a34b)", color: "#281d0e", fontFamily: SANS, fontWeight: 700, fontSize: 26, boxShadow: "0 18px 40px #0007", whiteSpace: "nowrap" }}>
        {c.text}
      </span>
    </div>
  );
};

/** A floating browser window showing a captured screen, a camera move inside it, and a gentle 3D tilt. */
export const Browser: React.FC<{ beat: Beat; frames: number }> = ({ beat, frames }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const [s0, x0, y0] = beat.from ?? [1, 0, 0];
  const [s1, x1, y1] = beat.to ?? [1, 0, 0];
  const s = s0 + (s1 - s0) * t;
  const x = x0 + (x1 - x0) * t;
  const y = y0 + (y1 - y0) * t;
  const enter = interpolate(f, [0, XF], [0, 1], { extrapolateRight: "clamp", easing: ease });
  const exit = interpolate(f, [frames - XF, frames], [1, 0], { extrapolateLeft: "clamp" });
  const tilt = interpolate(f, [0, frames], [4, -3]);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", perspective: 2200, opacity: Math.min(enter, exit) }}>
      <div style={{ width: 1600, height: 944, borderRadius: 18, overflow: "hidden", background: "#fff", boxShadow: "0 60px 140px #000a, 0 0 0 1px #ffffff18", transform: `translateY(${(1 - enter) * 60}px) rotateY(${tilt}deg) rotateX(${2 + (1 - enter) * 6}deg) scale(${0.96 + enter * 0.04})` }}>
        <div style={{ height: 44, background: "#161a17", display: "flex", alignItems: "center", gap: 8, padding: "0 18px" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
          ))}
          <span style={{ marginLeft: 18, padding: "6px 16px", borderRadius: 8, background: "#232823", color: "#aab7ad", fontFamily: SANS, fontSize: 15 }}>finance-coach-six.vercel.app</span>
        </div>
        <div style={{ width: 1600, height: 900, overflow: "hidden" }}>
          <Img src={staticFile(`shots/${beat.shot}.png`)} style={{ width: 1600, height: 900, objectFit: "cover", transformOrigin: "50% 40%", transform: `translate(${x}px, ${y}px) scale(${s})` }} />
        </div>
      </div>
      {(beat.callouts ?? []).map((c, i) => (
        <CalloutTag key={i} c={c} frames={frames} />
      ))}
    </AbsoluteFill>
  );
};

/** Opening: scattered money fragments drift, then fall away. */
export const Chaos: React.FC<{ frames: number }> = ({ frames }) => {
  const f = useCurrentFrame();
  const items = ["UPI ₹450 · Swiggy", "HDFC statement.pdf", "Netflix ₹649", "₹12,000 → Chhotu", "Rent ₹25,000", "INR 2,349 · Myntra", "SIP ₹10,000", "Hotstar ₹299", "ATM ₹2,000", "OTP 482913"];
  const fall = interpolate(f, [frames * 0.55, frames * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  return (
    <AbsoluteFill>
      {items.map((t, i) => {
        const a = (i * 137.5 * Math.PI) / 180;
        const r = 260 + (i % 4) * 90;
        const x = 960 + Math.cos(a + f / 90) * r * 1.6;
        const y = 520 + Math.sin(a * 1.3 + f / 110) * r * 0.75 + fall * (700 + i * 40);
        const appear = interpolate(f, [i * 6, i * 6 + 20], [0, 1], { extrapolateRight: "clamp" });
        return (
          <div key={t} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) rotate(${Math.sin(i + f / 40) * 8}deg)`, opacity: appear * (1 - fall), padding: "16px 24px", borderRadius: 14, background: i % 3 === 0 ? "#f3eee1" : "#1d3a2e", color: i % 3 === 0 ? "#1d241f" : "#d9eadf", border: "1px solid #6ab08d55", fontFamily: SANS, fontSize: 28, boxShadow: "0 20px 40px #0008", whiteSpace: "nowrap" }}>
            {t}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Three phones fanning out in 3D. */
export const Phones: React.FC<{ shots: string[]; frames: number }> = ({ shots, frames }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = interpolate(f, [frames - XF, frames], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", perspective: 1800, opacity: exit }}>
      <div style={{ display: "flex", gap: 70 }}>
        {shots.map((s, i) => {
          const p = spring({ frame: f - i * 8, fps, config: { damping: 16 } });
          const rot = (i - 1) * -14 + Math.sin(f / 50 + i) * 2;
          return (
            <div key={s} style={{ width: 360, height: 760, borderRadius: 48, padding: 14, background: "#0d0f0e", boxShadow: "0 50px 100px #000c, 0 0 0 2px #2c332e", transform: `translateY(${(1 - p) * 300 + (i === 1 ? -30 : 20)}px) rotateY(${rot}deg)`, opacity: p }}>
              <Img src={staticFile(`shots/${s}.png`)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", borderRadius: 36 }} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Wrapped cards flick past like a story reel, with a page turn. */
export const WrappedReel: React.FC<{ count: number; frames: number }> = ({ count, frames }) => {
  const f = useCurrentFrame();
  const per = frames / count;
  const i = Math.min(count - 1, Math.floor(f / per));
  const local = (f - i * per) / per;
  const turn = interpolate(local, [0, 0.25], [70, 0], { extrapolateRight: "clamp", easing: ease });
  const exit = interpolate(f, [frames - XF, frames], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", perspective: 1600, opacity: exit }}>
      <div style={{ width: 1600, height: 900, borderRadius: 18, overflow: "hidden", transform: `rotateY(${turn}deg)`, transformOrigin: "left center", boxShadow: "0 60px 140px #000a" }}>
        <Img src={staticFile(`shots/wrapped-${i + 1}.png`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    </AbsoluteFill>
  );
};

/** End card: the loop, the wordmark, the URL and the build credit. */
export const EndCard: React.FC<{ frames: number }> = ({ frames }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = ["Import.", "Understand.", "Simulate.", "Act."];
  const fade = interpolate(f, [frames - 30, frames], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: SERIF, color: C.ivory, opacity: fade }}>
      <div style={{ display: "flex", gap: 34, fontSize: 64 }}>
        {words.map((w, i) => {
          const p = spring({ frame: f - i * 10, fps, config: { damping: 18 } });
          return (
            <span key={w} style={{ opacity: p, transform: `translateY(${(1 - p) * 40}px)`, color: i === 3 ? C.gold : C.ivory }}>
              {w}
            </span>
          );
        })}
      </div>
      <div style={{ marginTop: 70, fontSize: 210, lineHeight: 1, opacity: spring({ frame: f - 55, fps }) }}>
        Kosh<span style={{ color: C.gold }}>.</span>
      </div>
      <div style={{ marginTop: 40, fontFamily: SANS, fontSize: 34, color: C.muted, opacity: spring({ frame: f - 80, fps }) }}>finance-coach-six.vercel.app</div>
      <div style={{ marginTop: 22, fontFamily: SANS, fontSize: 24, color: C.teal, opacity: spring({ frame: f - 100, fps }) }}>
        Built entirely by voice with Wispr Flow · Educational guidance, not investment advice
      </div>
    </AbsoluteFill>
  );
};
