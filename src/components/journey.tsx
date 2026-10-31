"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { NAV, navType } from "./shell/app-shell";

/** The product's four-step flow, shown on the Overview. Order carries meaning, so it's a real <ol>. */
const STEPS = [
  { href: "/import", title: "Bring in your money", body: "Drop a PDF or CSV statement, or paste bank SMS." },
  { href: "/transactions", title: "Teach Kosh once", body: "Fix a category and it learns the rule for good." },
  { href: "/planner", title: "Try a what-if", body: "Ask in plain words and watch your goal dates move." },
  { href: "/report", title: "Review the month", body: "A one-page story of what went well and what to watch." },
];

export function Journey() {
  const path = usePathname();
  return (
    <section>
      <h2 className="reveal font-display text-[40px] leading-none tracking-[-0.02em] sm:text-[56px]">Four steps. That&rsquo;s the whole app.</h2>
      <ol className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.href} className="reveal">
            <Link
              href={s.href}
              transitionTypes={navType(path, s.href)}
              className="group flex h-full flex-col rounded-[var(--radius)] bg-surface p-7 transition-colors hover:bg-ink hover:text-bg"
            >
              <span className="font-display text-[56px] leading-none text-fill">{i + 1}</span>
              <span className="mt-8 text-[22px] font-semibold leading-tight tracking-[-0.01em]">{s.title}</span>
              <span className="mt-2 flex-1 text-[16.5px] leading-relaxed text-muted group-hover:text-bg/75">{s.body}</span>
              <span className="mt-6 inline-flex items-center gap-1.5 text-[15.5px] font-medium">
                Go <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
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
  "/": "Back to your overview",
};

/** Big "next step" link at the bottom of every page, following the nav order. */
export function NextStep() {
  const path = usePathname();
  const i = NAV.findIndex((n) => (n.href === "/" ? path === "/" : path.startsWith(n.href)));
  if (i < 0) return null;
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
