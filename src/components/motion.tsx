"use client";

import { useEffect, useRef, useState } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Counts from the previous value to `value` with an expo ease-out. */
export function CountUp({ value, format, duration = 1100 }: { value: number; format: (n: number) => string; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(0);

  useEffect(() => {
    if (reduced()) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setShown(a + (value - a) * e);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className="num">{format(shown)}</span>;
}

/** Full-screen title card on the first visit of a session. Click to skip. */
export function Intro() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("kosh-intro") === "1";
      sessionStorage.setItem("kosh-intro", "1");
    } catch {}
    if (seen || reduced()) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 2700);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;
  return (
    <div
      onClick={() => setShow(false)}
      className="intro fixed inset-0 z-[100] flex cursor-pointer flex-col items-start justify-end bg-ink px-8 pb-16 text-bg sm:px-16 sm:pb-24"
      aria-hidden
    >
      <div className="overflow-hidden">
        <p className="intro-word font-display text-[22vw] leading-[0.8] sm:text-[15vw]">Kosh</p>
      </div>
      <div className="intro-line mt-6 h-[3px] w-40 bg-fill" />
      <p className="intro-sub mt-5 max-w-[34ch] text-[17px] leading-snug opacity-80">
        Your money, understood. A coach that learns how you live and plans with you.
      </p>
    </div>
  );
}
