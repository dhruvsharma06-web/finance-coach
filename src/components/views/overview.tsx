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
import { CategoryIcon } from "../category";
import { MoneyFlow, type FlowSegment } from "../money-flow";
import { CountUp } from "../motion";
import { NudgeList } from "../nudges";
import { WhatIfBand } from "../what-if-band";
import { JourneyStrip } from "../journey";
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
        <Skeleton className="h-28 w-3/4" />
        <Skeleton className="h-[320px] w-full" />
      </div>
    );
  }

  const pct = Math.round(d.savingsRate * 100);
  const pace = [...d.budgetPace].sort((a, b) => b.paceRatio - a.paceRatio).slice(0, 4);

  return (
    <div className="space-y-14">
      {/* ── Hero + the living model, together in the first view ── */}
      <section className="scroll-lift">
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
          <h1 className="mt-5 max-w-[18ch] font-display text-[46px] leading-[0.98] tracking-[-0.03em] text-ink text-balance sm:text-[68px] xl:text-[76px]">
            You spent <CountUp value={d.spending} format={formatINR} duration={1600} /> and kept{" "}
            <CountUp value={pct} format={(n) => `${Math.round(n)}%`} duration={1600} />.
          </h1>
          <p className="mt-4 max-w-[60ch] text-[18px] leading-relaxed text-muted text-pretty">{storyLine(d)}</p>
        </div>

        <div className="reveal mt-8 rounded-[var(--radius)] bg-surface px-4 pt-6 pb-8 sm:px-8">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Where every rupee went</h2>
            <Link href="/transactions" className="inline-flex items-center gap-1 text-[15px] text-muted hover:text-ink">
              {d.byCategory.reduce((s, c) => s + c.txnCount, 0)} transactions <ArrowRight size={14} />
            </Link>
          </div>
          <MoneyFlow income={Math.max(d.income, d.spending)} segments={segments} height={300} />
        </div>
        <AskBar className="reveal mt-4" />
      </section>

      <JourneyStrip />

      {/* ── One tight grid: what needs you, goals, pace ── */}
      <section className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Panel
          title="Kosh noticed"
          action={<Badge tone={d.nudges.length ? "warn" : "positive"}>{d.nudges.length} open</Badge>}
        >
          <NudgeList limit={3} nudges={d.nudges} onDismiss={(id) => setData({ ...d, nudges: d.nudges.filter((n) => n.id !== id) })} />
        </Panel>

        <div className="space-y-5">
          <Panel
            title="Goals"
            action={
              <Link href="/planner" className="inline-flex items-center gap-1 text-[14.5px] text-muted hover:text-ink">
                Plan <ArrowRight size={13} />
              </Link>
            }
          >
            <ul className="space-y-5">
              {d.goals.map((g) => {
                const r = g.currentAmount / g.targetAmount;
                return (
                  <li key={g.id}>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <span className="text-[16px] text-ink">{g.name}</span>
                      <span className="num font-display text-[26px] leading-none text-ink">{Math.round(r * 100)}%</span>
                    </div>
                    <Meter value={r} />
                    <p className="num mt-1.5 text-[14px] text-muted">
                      {formatINRCompact(g.currentAmount)} of {formatINRCompact(g.targetAmount)} · by{" "}
                      {new Date(g.targetDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    </p>
                  </li>
                );
              })}
            </ul>
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
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-[15px]">
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
      </section>

      <WhatIfBand compact />
    </div>
  );
}
