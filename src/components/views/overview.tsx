"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ArrowDown, Upload } from "lucide-react";
import { api } from "@/lib/client";
import { useApi } from "@/lib/use-api";
import { getCategory } from "@/lib/categories";
import { formatINR, formatINRCompact, monthLabel } from "@/lib/format";
import type { CategoryId, DashboardSummary } from "@/lib/types";
import { AskBar } from "../ask-bar";
import { CategoryIcon } from "../category";
import { DailySpendChart } from "../charts";
import { MoneyFlow, type FlowSegment } from "../money-flow";
import { CountUp } from "../motion";
import { NudgeList } from "../nudges";
import { WhatIfBand } from "../what-if-band";
import { Journey } from "../journey";
import { Badge, Button, ErrorNote, Meter, Panel, Skeleton } from "../ui";

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
  if (over[0]) parts.push(`${getCategory(over[0].category).label.split(" ")[0]} ran ${formatINR(Math.max(0, over[0].spent - over[0].budget))} over plan${over.length > 1 ? `, and ${getCategory(over[1].category).label.toLowerCase()} is close behind` : ""}.`);
  else parts.push("Every budget is on pace.");
  return parts.join(" ");
}

export function OverviewView() {
  const [month, setMonth] = useState<string | undefined>();
  const { data: months } = useApi(() => api.reportMonths());
  const { data: d, error, reload, setData } = useApi(() => api.dashboard(month), [month]);
  const segments = useMemo(() => (d ? flowSegments(d) : []), [d]);

  if (error) return <ErrorNote error={error} retry={reload} />;
  if (!d) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-40 w-3/4" />
        <Skeleton className="h-[340px] w-full" />
      </div>
    );
  }

  const pct = Math.round(d.savingsRate * 100);
  const pace = [...d.budgetPace].sort((a, b) => b.paceRatio - a.paceRatio);
  const committed = d.upcomingRecurring.reduce((s, r) => s + r.lastAmount, 0);

  return (
    <div className="space-y-24 sm:space-y-32">
      {/* ── Hero ── */}
      <section className="scroll-lift flex min-h-[calc(100svh-9rem)] flex-col">
        <div className="stagger">
          <div className="flex flex-wrap items-center justify-between gap-3">
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
          <h1 className="mt-6 max-w-[14ch] font-display text-[52px] leading-[0.95] tracking-[-0.035em] text-ink text-balance sm:text-[88px] xl:text-[104px]">
            You spent <CountUp value={d.spending} format={formatINR} duration={1600} /> and kept{" "}
            <CountUp value={pct} format={(n) => `${Math.round(n)}%`} duration={1600} />.
          </h1>
          <p className="mt-6 max-w-[52ch] text-[18px] leading-relaxed text-muted text-pretty sm:text-[20px]">{storyLine(d)}</p>
        </div>
        <div className="mt-auto flex items-center gap-2 pt-10 text-[14.5px] text-subtle">
          <ArrowDown size={14} className="animate-bounce" /> Scroll to see where it went
        </div>
      </section>

      {/* ── The living model ── */}
      <section className="reveal">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-[40px] leading-none tracking-[-0.02em] sm:text-[56px]">Where it went.</h2>
            <p className="mt-3 max-w-[50ch] text-[17px] text-muted">
              Every rupee that came in this month, followed to where it ended up. Built from {d.byCategory.reduce((s, c) => s + c.txnCount, 0)} real transactions.
            </p>
          </div>
          <Link href="/transactions" className="inline-flex items-center gap-1 text-[15.5px] font-medium text-ink underline-offset-4 hover:underline">
            See every transaction <ArrowRight size={14} />
          </Link>
        </div>
        <div className="rounded-[var(--radius)] bg-surface px-4 py-8 sm:px-8 sm:py-12">
          <MoneyFlow income={Math.max(d.income, d.spending)} segments={segments} height={360} />
        </div>
        <AskBar className="reveal mt-6" />
      </section>

      <Journey />

      {/* ── Attention + goals ── */}
      <section>
        <h2 className="reveal font-display text-[40px] leading-none tracking-[-0.02em] sm:text-[56px]">What needs you.</h2>
        <div className="mt-10 grid gap-5 lg:grid-cols-[1.45fr_1fr]">
          <Panel
            title="Kosh noticed"
            description="Watching your plan so you don't have to"
            action={<Badge tone={d.nudges.length ? "warn" : "positive"}>{d.nudges.length} open</Badge>}
          >
            <NudgeList limit={4} nudges={d.nudges} onDismiss={(id) => setData({ ...d, nudges: d.nudges.filter((n) => n.id !== id) })} />
          </Panel>
          <Panel
            title="Goals"
            description="Progress so far"
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
                      <span className="num font-display text-[26px] leading-none text-ink">{Math.round(r * 100)}%</span>
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

      {/* ── Pace + rhythm ── */}
      <section>
        <h2 className="reveal font-display text-[40px] leading-none tracking-[-0.02em] sm:text-[56px]">How the month is pacing.</h2>
        <div className="mt-10 grid gap-5 lg:grid-cols-[1.45fr_1fr]">
          <Panel
            title="Budget pace"
            description="The tick shows where you should be by now"
            action={
              <Link href="/goals" className="text-[14.5px] text-muted hover:text-ink">
                Edit budgets
              </Link>
            }
          >
            <ul className="space-y-4">
              {pace.map((p) => {
                const over = p.paceRatio > 1.15;
                const ratio = p.budget ? p.spent / p.budget : 0;
                return (
                  <li key={p.category}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-[15px]">
                      <Link href={`/transactions?category=${p.category}`} className="flex items-center gap-2 text-ink underline-offset-4 hover:underline">
                        {getCategory(p.category).label}
                        {over && <Badge tone={p.paceRatio > 1.4 ? "danger" : "warn"}>{Math.round((p.paceRatio - 1) * 100)}% over pace</Badge>}
                      </Link>
                      <span className="num text-muted">
                        <span className="text-ink">{formatINR(p.spent)}</span> / {formatINRCompact(p.budget)}
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

          <div className="space-y-5">
            <Panel
              title="Day-to-day spending"
              description={`${formatINRCompact(d.dailySpend.reduce((s, x) => s + x.amount, 0) / d.dailySpend.length)} a day, excluding rent and bills`}
            >
              <DailySpendChart data={d.dailySpend} />
            </Panel>

            <Panel
              title="Coming up"
              description={`${formatINR(committed)} in recurring payments`}
              action={
                <Link href="/subscriptions" className="inline-flex items-center gap-1 text-[14.5px] text-muted hover:text-ink">
                  All <ArrowRight size={13} />
                </Link>
              }
              bleed
            >
              <ul className="divide-y divide-line pb-2">
                {d.upcomingRecurring.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-6 py-2.5">
                    <CategoryIcon id={r.category} size={14} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15.5px] text-ink">{r.merchant}</p>
                      <p className="text-[13.5px] text-muted">
                        {new Date(r.nextExpectedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    {r.status === "price_changed" && <Badge tone="warn">Price up</Badge>}
                    {r.status === "possibly_unused" && <Badge tone="info">Still using?</Badge>}
                    <span className="num text-[15.5px] text-ink">{formatINR(r.lastAmount)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </section>

      {/* ── Close ── */}
      <div className="space-y-5">
        <WhatIfBand />
        <div className="reveal flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius)] bg-surface px-6 py-6 sm:px-8">
          <div>
            <p className="text-[17px] font-medium text-ink">Got a new statement?</p>
            <p className="text-[15px] text-muted">Drop a PDF, a CSV from any bank, or a pile of SMS. Kosh sorts it in seconds.</p>
          </div>
          <Link href="/import">
            <Button variant="primary">
              <Upload size={15} /> Import
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
