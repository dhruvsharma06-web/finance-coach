"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

const ENDINGS = [
  "I cut dining out by 30%?",
  "I get a 15% raise in April?",
  "I buy a ₹60,000 phone in December?",
  "my rent goes up by 3,000?",
  "I cancel my unused subscriptions?",
];

/** Closing band: types out real what-ifs one after another; click sends the current one to the planner. */
export function WhatIfBand({ compact }: { compact?: boolean }) {
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const [phase, setPhase] = useState<"type" | "hold" | "erase">("type");
  const text = ENDINGS[i];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(text.length);
      const t = setTimeout(() => setI((x) => (x + 1) % ENDINGS.length), 3200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => {
        if (phase === "type") {
          if (n < text.length) setN(n + 1);
          else setPhase("hold");
        } else if (phase === "hold") setPhase("erase");
        else if (n > 0) setN(n - 1);
        else {
          setI((x) => (x + 1) % ENDINGS.length);
          setPhase("type");
        }
      },
      phase === "type" ? 42 : phase === "hold" ? 1900 : 18,
    );
    return () => clearTimeout(t);
  }, [n, phase, text.length]);

  const full = `What if ${text}`;

  return (
    <section className={`reveal overflow-hidden rounded-[var(--radius)] bg-ink px-6 text-bg sm:px-12 ${compact ? "flex flex-wrap items-end justify-between gap-6 py-10 sm:py-12" : "py-14 sm:py-20"}`}>
      <div>
      <p className="text-[16.5px] opacity-70">Every decision, before you make it.</p>
      <p className={`mt-3 min-h-[2.1em] max-w-[24ch] font-display leading-[1.02] tracking-[-0.02em] ${compact ? "text-[34px] sm:text-[48px]" : "text-[40px] sm:min-h-[2.05em] sm:text-[68px]"}`} aria-live="polite">
        What if {text.slice(0, n)}
        <span className="caret ml-0.5 inline-block h-[0.8em] w-[3px] translate-y-[0.08em] bg-fill align-baseline" />
      </p>
      </div>
      <Link
        href={`/planner?q=${encodeURIComponent(full)}`}
        className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-fill px-6 text-[16.5px] font-medium text-fill-ink transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        Model this one <ArrowRight size={16} />
      </Link>
    </section>
  );
}
