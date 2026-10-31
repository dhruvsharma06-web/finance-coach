"use client";

import type { RecurringPayment } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { formatINR, formatINRCompact } from "@/lib/format";
import { cn } from "./ui";

/**
 * A month on one line: every recurring payment as a bar on the day it lands, height by amount (log scale).
 * Bars grow in, staggered by day, when the strip scrolls into view (.reveal.in).
 */
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

export function AutopayStrip({ items }: { items: RecurringPayment[] }) {
  const active = items.filter((r) => r.status !== "cancelled" && r.cadence === "monthly");
  if (!active.length) return null;
  const month = active[0].nextExpectedDate.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  const byDay = new Map<number, RecurringPayment[]>();
  for (const r of active) {
    const d = Number(r.nextExpectedDate.slice(8, 10));
    byDay.set(d, [...(byDay.get(d) ?? []), r]);
  }
  const max = Math.max(...active.map((r) => r.lastAmount));
  const scale = (v: number) => Math.max(0.08, Math.log10(v + 1) / Math.log10(max + 1));
  const monthName = new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long" });

  return (
    <section className="reveal rounded-[var(--radius)] bg-surface p-6 sm:p-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-[34px] leading-none tracking-[-0.02em] sm:text-[44px]">Your {monthName}, on autopilot</h2>
        <p className="text-[15.5px] text-muted">Each bar is a payment on the day it lands</p>
      </div>
      <div className="mt-10 flex h-[220px] items-end gap-[3px] sm:gap-1.5">
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1;
          const list = byDay.get(day) ?? [];
          return (
            <div key={day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              {list.map((r) => (
                <div
                  key={r.id}
                  title={`${r.merchant} · ${formatINR(r.lastAmount)} on ${day} ${monthName}`}
                  className={cn(
                    "grow-bar relative w-full rounded-t-[3px]",
                    r.status === "price_changed" && "ring-2 ring-warn ring-offset-2 ring-offset-surface",
                  )}
                  style={{
                    height: `${scale(r.lastAmount) * 170}px`,
                    background: getCategory(r.category).color,
                    transitionDelay: `${300 + day * 28}ms`,
                  }}
                >
                  {r.lastAmount >= max * 0.2 && (
                    <span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[13px] font-medium text-ink sm:block">
                      {formatINRCompact(r.lastAmount)}
                    </span>
                  )}
                </div>
              ))}
              <span className={cn("text-[11.5px] tabular-nums", list.length ? "font-semibold text-ink" : "text-subtle", day % 5 && day !== 1 && !list.length && "invisible sm:visible")}>
                {day}
              </span>
            </div>
          );
        })}
      </div>
      <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
        {active
          .sort((a, b) => a.nextExpectedDate.localeCompare(b.nextExpectedDate))
          .map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-[15px]">
              <span className="size-2.5 rounded-full" style={{ background: getCategory(r.category).color }} />
              <span className="text-ink">{r.merchant}</span>
              <span className="num text-muted">{ordinal(Number(r.nextExpectedDate.slice(8, 10)))}</span>
            </li>
          ))}
      </ul>
    </section>
  );
}
