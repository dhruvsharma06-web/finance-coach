"use client";

import { useState } from "react";
import { Printer, ThumbsUp, Eye } from "lucide-react";
import { api } from "@/lib/client";
import { useApi } from "@/lib/use-api";
import { getCategory } from "@/lib/categories";
import { addMonths, formatINR, formatPct, monthLabel } from "@/lib/format";
import type { MonthlyReport } from "@/lib/types";
import { CategoryDot } from "../category";
import { CountUp } from "../motion";
import { Button, ErrorNote, Meter, Skeleton, cn } from "../ui";

const LATEST = "2026-10";
const MONTHS = [LATEST, addMonths(LATEST, -1), addMonths(LATEST, -2)];

function Body({ r }: { r: MonthlyReport }) {
  const maxCat = Math.max(...r.byCategory.map((c) => Math.max(c.amount, c.budget ?? 0)), 1);
  return (
    <article className="stagger space-y-14">
      <header>
        <h1 className="max-w-[24ch] font-display text-[46px] leading-[0.98] tracking-[-0.03em] text-ink text-balance sm:text-[72px]">
          In {monthLabel(r.month).split(" ")[0]} you kept{" "}
          <CountUp value={Math.round(r.totals.savingsRate * 100)} format={(n) => `${Math.round(n)}%`} /> of what you earned.
        </h1>
        <dl className="mt-8 grid max-w-2xl grid-cols-3 gap-6 border-t border-line pt-5">
          {[
            ["Came in", r.totals.income],
            ["Went out", r.totals.spending],
            ["Kept", r.totals.savings],
          ].map(([l, v]) => (
            <div key={l as string}>
              <dt className="text-[13px] text-muted">{l}</dt>
              <dd className="mt-1 text-[22px] font-medium tracking-tight text-ink"><CountUp value={v as number} format={formatINR} /></dd>
            </div>
          ))}
        </dl>
      </header>

      {r.narrative && (
        <section className="max-w-[68ch] space-y-4 text-[17px] leading-[1.7] text-ink text-pretty">
          {r.narrative.split(/\n\s*\n/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </section>
      )}

      {(r.wins.length > 0 || r.watchouts.length > 0) && (
        <section className="grid gap-8 sm:grid-cols-2">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-positive">
              <ThumbsUp size={16} /> What went well
            </h2>
            <ul className="space-y-2.5">
              {r.wins.map((w) => (
                <li key={w} className="text-[15px] leading-relaxed text-ink">{w}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-warn">
              <Eye size={16} /> Keep an eye on
            </h2>
            <ul className="space-y-2.5">
              {r.watchouts.map((w) => (
                <li key={w} className="text-[15px] leading-relaxed text-ink">{w}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {r.byCategory.length > 0 && (
        <section>
          <h2 className="mb-4 text-[15px] font-semibold text-ink">Spending by category</h2>
          <ul className="divide-y divide-line border-y border-line">
            {r.byCategory.map((c) => (
              <li key={c.category} className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-3 sm:grid-cols-[200px_1fr_110px_80px]">
                <span className="flex items-center gap-2 text-[14px] text-ink">
                  <CategoryDot id={c.category} /> {getCategory(c.category).label}
                </span>
                <Meter className="order-last col-span-2 sm:order-none sm:col-span-1" value={c.amount / maxCat} color={getCategory(c.category).color} marker={c.budget ? c.budget / maxCat : undefined} />
                <span className="num text-right text-[14px] text-ink">{formatINR(c.amount)}</span>
                <span
                  className={cn(
                    "num hidden text-right text-[13px] sm:block",
                    c.changePct === null ? "text-subtle" : c.changePct > 0 ? "text-danger" : "text-positive",
                  )}
                >
                  {c.changePct === null ? "—" : formatPct(c.changePct)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-subtle">Tick marks show your budget. Change is vs the previous month.</p>
        </section>
      )}

      {r.topMerchants.length > 0 && (
        <section className="grid gap-10 sm:grid-cols-2">
          <div>
            <h2 className="mb-4 text-[15px] font-semibold text-ink">Where it went most</h2>
            <ol className="space-y-2.5">
              {r.topMerchants.map((m, i) => (
                <li key={m.merchant} className="flex items-baseline gap-3 text-[14.5px]">
                  <span className="num w-4 text-subtle">{i + 1}</span>
                  <span className="flex-1 text-ink">{m.merchant}</span>
                  <span className="text-[12.5px] text-muted">{m.count}×</span>
                  <span className="num text-ink">{formatINR(m.amount)}</span>
                </li>
              ))}
            </ol>
          </div>
          {r.goalsProgress.length > 0 && (
            <div>
              <h2 className="mb-4 text-[15px] font-semibold text-ink">Goals</h2>
              <ul className="space-y-4">
                {r.goalsProgress.map((g) => (
                  <li key={g.goalId}>
                    <div className="mb-1.5 flex justify-between text-[14px]">
                      <span className="text-ink">{g.name}</span>
                      <span className={g.onTrack ? "text-positive" : "text-warn"}>{g.onTrack ? "On track" : "Behind"}</span>
                    </div>
                    <Meter value={g.pct > 1 ? g.pct / 100 : g.pct} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <footer className="border-t border-line pt-4 text-[12px] text-subtle">
        Generated by Kosh on {new Date(r.generatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}. Educational
        insights only, not investment advice.
      </footer>
    </article>
  );
}

export function ReportView() {
  const [month, setMonth] = useState(LATEST);
  const { data, error, loading, reload } = useApi(() => api.report(month), [month]);

  return (
    <div className="mx-auto max-w-[920px]">
      <div className="no-print mb-10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-line bg-surface p-1">
          {MONTHS.map((m) => (
            <button
              key={m}
              onClick={() => setMonth(m)}
              className={cn("rounded-full px-3.5 py-1.5 text-[13px]", m === month ? "bg-ink text-bg" : "text-muted hover:text-ink")}
            >
              <span className="sm:hidden">{monthLabel(m).slice(0, 3)}</span>
              <span className="hidden sm:inline">{monthLabel(m)}</span>
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => window.print()}>
          <Printer size={14} /> Print / save PDF
        </Button>
      </div>
      {error && <ErrorNote error={error} retry={reload} />}
      {loading || !data ? (
        <div className="space-y-6">
          <Skeleton className="h-32 w-3/4" />
          <Skeleton className="h-20" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <Body r={data} />
      )}
    </div>
  );
}
