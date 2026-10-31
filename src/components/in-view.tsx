"use client";

import { useEffect, useRef, useState } from "react";

/** Mounts children only once they scroll into view, so their own entrance animation (charts) plays where you can see it. */
export function InView({ children, height, className }: { children: React.ReactNode; height: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{ minHeight: height }}>
      {shown && children}
    </div>
  );
}

/** Splits a plain-text title into words that rise in one after another on load. */
export function Words({ text, offset = 0 }: { text: string; offset?: number }) {
  return (
    <>
      {text.split(" ").map((w, i, all) => (
        <span key={i} className="word" style={{ "--w": i + offset } as React.CSSProperties}>
          {w}
          {i < all.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}
