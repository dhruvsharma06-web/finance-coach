"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/client";
import { useApi } from "@/lib/use-api";
import { getCategory } from "@/lib/categories";
import { formatINR, formatINRCompact, monthLabel } from "@/lib/format";
import type { CategoryId, DashboardSummary } from "@/lib/types";
import { AskBar } from "../ask-bar";
import { AutopayStrip } from "../autopay-strip";
import { CategoryIcon } from "../category";
import { DailySpendChart } from "../charts";
import { InView, Words } from "../in-view";
import { JourneyStrip } from "../journey";
import { MoneyFlow, type FlowSegment } from "../money-flow";
import { CountUp } from "../motion";
import { NudgeList } from "../nudges";
import { WhatIfBand } from "../what-if-band";
import { Badge, ErrorNote, Meter, Panel, Skeleton } from "../ui";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const GROUPS: { label: string; colorVar: string; cats: CategoryId[] }[] = [
  { label: "Rent & bills", colorVar: "--ink", cats: ["rent", "emi", "utilities", "insurance"] },
  { label: "Food", colorVar: "--cat-dining", cats: ["dining", "groceries"] },
  { label: "Lifestyle", colorVar: "--cat-shopping", cats: ["shopping", "entertainment", "subscriptions", "travel"] },
  { label: "Getting around", colorVar: "--cat-transport", cats: ["transport", "fuel"] },
  { label: "Everything else", colorVar: "--subtle", cats: ["health", "education", "cash", "fees", "other"] },
];

function flowSegments(d: DashboardSummary): FlowSegment[] {
  const by = new Map(d.byCategory.map((c) => [c.category, c.amount]));
  const segs = GROUPS.map((g) => ({ label: g.label, colorVar: g.colorVar, value: Math.round(g.cats.reduce((s, c) => s + (by.get(c) ?? 0), 0)) }));
  segs.push({ label: "Saved & invested", colorVar: "--positive", value: Math.max(0, Math.round(d.income - d.spending)) });
  return segs.filter((s) => s.value > 0);
}

/** One plain sentence that says what matters this month. */
function storyLine(d: DashboardSummary): string {
  const fixed = d.byCategory.filter((c) => ["rent", "emi", "utilities", "insurance"].includes(c.category)).reduce((s, c) => s + c.amount, 0);
  const over = [...d.budgetPace].filter((p) => p.paceRatio > 1.15).sort((a, b) => b.spent - b.budget - (a.spent - a.budget));
  const parts = [`Rent and bills took ${formatINR(fixed)}.`];
  if (over[0]) parts.push(`${getCategory(over[0].category).label.split(" ")[0]} ran ${formatINR(Math.max(0, over[0].spent - over[0].budget))} over plan.`);
  else parts.push("Every budget is on pace.");
  return parts.join(" ");
}

const word = (i: number) => ({ "--w": i }) as React.CSSProperties;

export function OverviewView() {
  const [month, setMonth] = useState<string | undefined>();
  const { data: months } = useApi(() => api.reportMonths());
  const { data: recurring } = useApi(() => api.recurring());
  const { data: d, error, reload, setData } = useApi(() => api.dashboard(month), [month]);
  const segments = useMemo(() => (d ? flowSegments(d) : []), [d]);

  if (error) return <ErrorNote error={error} retry={reload} />;
  if (!d) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-36 w-3/4" />
        <Skeleton className="h-[340px] w-full" />
      </div>
    );
  }

  const pct = Math.round(d.savingsRate * 100);
  const pace = [...d.budgetPace].sort((a, b) => b.paceRatio - a.paceRatio).slice(0, 5);
  const dailyTotal = d.dailySpend.reduce((s, x) => s + x.amount, 0);
  const peak = d.dailySpend.reduce((m, x) => (x.amount > m.amount ? x : m), d.dailySpend[0]);

  return (
    <div className="space-y-20 sm:space-y-28">
      {/* ── Opening: words rise in one by one, numbers count up ── */}
      <section className="scroll-lift">
        <div className="rise flex flex-wrap items-center justify-between gap-3">
          <p className="text-[16.5px] text-muted">
            {greeting()}, Aarav. Here&rsquo;s {monthLabel(d.month)}.
          </p>
          {months && months.length > 1 && (
            <div className="flex gap-1 rounded-full bg-surface p-1">
              {months.slice(0, 4).map((m) => (
                <button
                  key={m}
                  onClick={() => setMonth(m)}
                  className={`rounded-full px-3 py-1 text-[14.5px] transition-colors ${m === d.month ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
                >
                  {monthLabel(m).slice(0, 3)}
                </button>
              ))}
            </div>
          )}
        </div>
        <h1 className="mt-6 max-w-[16ch] font-display text-[50px] leading-[0.96] tracking-[-0.035em] text-ink text-balance sm:text-[80px] xl:text-[92px]">
          <Words text="You spent" />{" "}
          <span className="word" style={word(2)}>
            <CountUp value={d.spending} format={formatINR} duration={1800} />
          </span>{" "}
          <Words text="and kept" offset={3} />{" "}
          <span className="word" style={word(5)}>
            <CountUp value={pct} format={(n) => `${Math.round(n)}%`} duration={1800} />.
          </span>
        </h1>
        <p className="rise mt-6 max-w-[56ch] text-[19px] leading-relaxed text-muted text-pretty [animation-delay:700ms] sm:text-[20px]">{storyLine(d)}</p>
        <AskBar className="rise mt-8 [animation-delay:850ms]" />
      </section>

      {/* ── The living model ── */}
      <section className="scroll-zoom">
        <div className="reveal mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-[38px] leading-none tracking-[-0.02em] sm:text-[52px]">Where every rupee went.</h2>
            <p className="mt-3 max-w-[52ch] text-[17px] text-muted">
              This month&rsquo;s income, followed to where it ended up. Built from {d.byCategory.reduce((s, c) => s + c.txnCount, 0)} real transactions.
            </p>
          </div>
          <Link href="/transactions" className="inline-flex items-center gap-1 text-[16px] font-medium text-ink underline-offset-4 hover:underline">
            See them all <ArrowRight size={15} />
          </Link>
        </div>
        <div className="reveal rounded-[var(--radius)] bg-surface px-4 py-8 sm:px-8 sm:py-10">
          <MoneyFlow income={Math.max(d.income, d.spending)} segments={segments} height={340} />
        </div>
      </section>

      <JourneyStrip />

      {/* ── What needs you ── */}
      <section>
        <h2 className="reveal font-display text-[38px] leading-none tracking-[-0.02em] sm:text-[52px]">What needs you.</h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <Panel title="Kosh noticed" action={<Badge tone={d.nudges.length ? "warn" : "positive"}>{d.nudges.length} open</Badge>}>
            <NudgeList limit={4} nudges={d.nudges} onDismiss={(id) => setData({ ...d, nudges: d.nudges.filter((n) => n.id !== id) })} />
          </Panel>
          <Panel
            title="Goals"
            action={
              <Link href="/planner" className="inline-flex items-center gap-1 text-[14.5px] text-muted hover:text-ink">
                Plan <ArrowRight size={13} />
              </Link>
            }
          >
            <ul className="space-y-6">
              {d.goals.map((g) => {
                const r = g.currentAmount / g.targetAmount;
                return (
                  <li key={g.id}>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <span className="text-[16.5px] text-ink">{g.name}</span>
                      <span className="num font-display text-[30px] leading-none text-ink">{Math.round(r * 100)}%</span>
                    </div>
                    <Meter value={r} />
                    <p className="num mt-2 text-[14px] text-muted">
                      {formatINRCompact(g.currentAmount)} of {formatINRCompact(g.targetAmount)} · by{" "}
                      {new Date(g.targetDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    </p>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </section>

      {/* ── The rhythm of the month ── */}
      <section>
        <h2 className="reveal font-display text-[38px] leading-none tracking-[-0.02em] sm:text-[52px]">The rhythm of your month.</h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <Panel
            title="Day-to-day spending"
            description={`${formatINRCompact(dailyTotal / d.dailySpend.length)} a day on average, excluding rent and bills. Biggest day: ${new Date(peak.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.`}
          >
            <InView height={200}>
              <DailySpendChart data={d.dailySpend} height={200} />
            </InView>
          </Panel>
          <Panel
            title="Budget pace"
            action={
              <Link href="/goals" className="text-[14.5px] text-muted hover:text-ink">
                All budgets
              </Link>
            }
          >
            <ul className="space-y-4">
              {pace.map((p) => {
                const over = p.paceRatio > 1.15;
                const ratio = p.budget ? p.spent / p.budget : 0;
                return (
                  <li key={p.category}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-[15.5px]">
                      <span className="flex items-center gap-2 text-ink">
                        <CategoryIcon id={p.category} size={12} />
                        {getCategory(p.category).label.split(" ")[0]}
                        {over && <Badge tone={p.paceRatio > 1.4 ? "danger" : "warn"}>{Math.round((p.paceRatio - 1) * 100)}% over</Badge>}
                      </span>
                      <span className="num text-muted">
                        <span className="text-ink">{formatINRCompact(p.spent)}</span> / {formatINRCompact(p.budget)}
                      </span>
                    </div>
                    <Meter
                      value={ratio}
                      marker={ratio > 0 ? p.spent / p.budget / p.paceRatio : undefined}
                      color={over ? (p.paceRatio > 1.4 ? "var(--danger)" : "var(--warn)") : getCategory(p.category).color}
                    />
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
        {recurring && (
          <div className="mt-5">
            <AutopayStrip items={recurring} />
          </div>
        )}
      </section>

      <div className="scroll-zoom">
        <WhatIfBand />
      </div>
    </div>
  );
}
