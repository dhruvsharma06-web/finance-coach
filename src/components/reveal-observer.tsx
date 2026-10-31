"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * One observer for the whole app: every element with `.reveal` rises in when it scrolls into view.
 * Elements entering together are staggered 80ms apart. New elements (data loading in) are picked up
 * by a MutationObserver. Reduced motion: everything is shown immediately.
 */
export function RevealObserver() {
  const path = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      document.documentElement.classList.remove("motion");
      return;
    }
    document.documentElement.classList.add("motion");

    const io = new IntersectionObserver(
      (entries) => {
        const entering = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        entering.forEach((e, i) => {
          const el = e.target as HTMLElement;
          if (!el.style.getPropertyValue("--reveal-delay")) el.style.setProperty("--reveal-delay", `${Math.min(i, 6) * 80}ms`);
          el.classList.add("in");
          io.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    const scan = () => document.querySelectorAll<HTMLElement>(".reveal:not(.in)").forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [path]);

  return null;
}
