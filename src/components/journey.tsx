"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { NAV, navType } from "./shell/app-shell";

/** The product's four-step flow, shown on the Overview. Order carries meaning, so it's a real <ol>. */
const STEPS = [
  { href: "/import", title: "Bring in your money", body: "PDF, CSV or bank SMS" },
  { href: "/transactions", title: "Teach Kosh once", body: "Fix a category, it learns" },
  { href: "/planner", title: "Try a what-if", body: "Watch goal dates move" },
  { href: "/report", title: "Review the month", body: "Your one-page story" },
];

/** Compact four-step flow for the Overview: one row, with a line that draws across as it appears. */
export function JourneyStrip() {
  const path = usePathname();
  return (
    <nav aria-label="How to use Kosh" className="reveal relative">
      <div aria-hidden className="grow-line absolute top-[22px] right-[12%] left-[12%] hidden h-[2px] bg-fill sm:block" />
      <ol className="relative grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
        {STEPS.map((s, i) => (
          <li key={s.href}>
            <Link href={s.href} transitionTypes={navType(path, s.href)} className="group flex flex-col items-start gap-3 sm:items-center sm:text-center">
              <span className="grid size-11 place-items-center rounded-full bg-ink font-display text-[22px] text-bg transition-transform group-hover:scale-110">{i + 1}</span>
              <span>
                <span className="block text-[18px] font-semibold leading-tight tracking-[-0.01em] text-ink">{s.title}</span>
                <span className="mt-1 block text-[15px] leading-snug text-muted">{s.body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

const NEXT_COPY: Record<string, string> = {
  "/import": "Bring in a statement",
  "/transactions": "Review and teach your categories",
  "/subscriptions": "Check what repeats every month",
  "/goals": "Set your income, costs and goals",
  "/planner": "Try a what-if on your goals",
  "/coach": "Ask the coach anything",
  "/report": "Read this month's review",
  "/how-it-works": "See how Kosh works under the hood",
  "/dashboard": "Back to your overview",
};

/** Big "next step" link at the bottom of every page, following the nav order. */
export function NextStep() {
  const path = usePathname();
  const i = NAV.findIndex((n) => path === n.href || path.startsWith(n.href + "/"));
  if (i < 0 || path === "/dashboard") return null; // the Overview already has the journey strip
  const next = NAV[(i + 1) % NAV.length];
  return (
    <Link
      href={next.href}
      transitionTypes={navType(path, next.href)}
      className="reveal group mt-24 flex items-end justify-between gap-6 border-t border-line pt-8 pb-4"
    >
      <span>
        <span className="block text-[15.5px] text-muted">Next step</span>
        <span className="mt-2 block font-display text-[36px] leading-[1.05] tracking-[-0.02em] text-ink sm:text-[52px]">{NEXT_COPY[next.href] ?? next.label}</span>
      </span>
      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-fill text-fill-ink transition-transform group-hover:translate-x-1 sm:size-16">
        <ArrowRight size={24} />
      </span>
    </Link>
  );
}
