"use client";

import Link from "next/link";
import { ArrowRight, Upload } from "lucide-react";
import { api } from "@/lib/client";
import { useApi } from "@/lib/use-api";
import { getCategory } from "@/lib/categories";
import { formatINR, formatINRCompact, monthLabel } from "@/lib/format";
import type { DashboardSummary } from "@/lib/types";
import { AskBar } from "../ask-bar";
import { CategoryIcon } from "../category";
import { DailySpendChart } from "../charts";
import { CountUp } from "../motion";
import { NudgeList } from "../nudges";
import { Badge, Button, ErrorNote, Meter, Panel, Skeleton } from "../ui";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Allocation({ d }: { d: DashboardSummary }) {
  const groups = { needs: 0, wants: 0, other: 0 };
  for (const c of d.byCategory) {
    const g = getCategory(c.category).group;
    if (g === "needs") groups.needs += c.amount;
    else if (g === "wants") groups.wants += c.amount;
    else groups.other += c.amount;
  }
  const saved = Math.max(0, d.income - d.spending);
  const total = Math.max(d.income, d.spending, 1);
  const parts = [
    { label: "Needs", value: groups.needs, color: "var(--ink)" },
    { label: "Wants", value: groups.wants, color: "var(--fill)" },
    { label: "Other", value: groups.other, color: "var(--subtle)" },
    { label: "Saved & invested", value: saved, color: "var(--positive)" },
  ];
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        {parts.map((p) => (
          <div
            key={p.label}
            className="h-full transition-[width] duration-700 ease-out first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(p.value / total) * 100}%`, background: p.color }}
          />
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 xl:grid-cols-4">
        {parts.map((p) => (
          <div key={p.label}>
            <dt className="flex items-center gap-2 text-[12.5px] text-muted">
              <span className="size-2 rounded-full" style={{ background: p.color }} />
              {p.label}
            </dt>
            <dd className="num mt-0.5 text-[17px] font-medium tracking-tight text-ink">{formatINR(p.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function OverviewView() {
  const { data: d, error, loading, reload, setData } = useApi(() => api.dashboard());

  if (error) return <ErrorNote error={error} retry={reload} />;
  if (loading || !d) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-2/3" />
        <Skeleton className="h-14 w-full rounded-full" />
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const pct = Math.round(d.savingsRate * 100);
  const pace = [...d.budgetPace].sort((a, b) => b.paceRatio - a.paceRatio);
  const committed = d.upcomingRecurring.reduce((s, r) => s + r.lastAmount, 0);

  return (
    <div className="space-y-8">
      <section className="stagger">
        <p className="text-[15px] text-muted">
          {greeting()}, Aarav. Here&rsquo;s {monthLabel(d.month)}.
        </p>
        <h1 className="mt-4 max-w-[19ch] font-display text-[46px] leading-[0.98] tracking-[-0.03em] text-ink text-balance sm:text-[72px]">
          You spent <CountUp value={d.spending} format={formatINR} /> and kept <CountUp value={pct} format={(n) => `${Math.round(n)}%`} />.
        </h1>
        <AskBar className="mt-10" />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
        <div className="stagger space-y-5">
          <Panel title={`Where ${monthLabel(d.month).split(" ")[0]}’s money went`} description={`${formatINR(d.income)} came in this month`}>
            <Allocation d={d} />
          </Panel>

          <Panel
            title="Needs your attention"
            description="Kosh watches your plan so you don't have to"
            action={<Badge tone={d.nudges.length ? "warn" : "positive"}>{d.nudges.length} open</Badge>}
          >
            <NudgeList nudges={d.nudges} onDismiss={(id) => setData({ ...d, nudges: d.nudges.filter((n) => n.id !== id) })} />
          </Panel>

          <Panel
            title="Budget pace"
            description="The tick shows where you should be by now"
            action={
              <Link href="/goals" className="text-[13px] text-muted hover:text-ink">
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
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-[13.5px]">
                      <Link href={`/transactions?category=${p.category}`} className="flex items-center gap-2 text-ink hover:underline underline-offset-4">
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
        </div>

        <div className="stagger space-y-5">
          <Panel
            title="Day-to-day spending"
            description={`${formatINRCompact(d.dailySpend.reduce((s, x) => s + x.amount, 0) / d.dailySpend.length)} a day, excluding rent and bills`}
          >
            <DailySpendChart data={d.dailySpend} />
          </Panel>

          <Panel
            title="Goals"
            action={
              <Link href="/planner" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
                Plan <ArrowRight size={13} />
              </Link>
            }
          >
            <ul className="space-y-4">
              {d.goals.map((g) => {
                const r = g.currentAmount / g.targetAmount;
                return (
                  <li key={g.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="text-[14px] text-ink">{g.name}</span>
                      <span className="num text-[12.5px] text-muted">{Math.round(r * 100)}%</span>
                    </div>
                    <Meter value={r} />
                    <p className="num mt-1.5 text-[12px] text-muted">
                      {formatINRCompact(g.currentAmount)} of {formatINRCompact(g.targetAmount)} · by{" "}
                      {new Date(g.targetDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    </p>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel
            title="Coming up"
            description={`${formatINR(committed)} in recurring payments`}
            action={
              <Link href="/subscriptions" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
                All <ArrowRight size={13} />
              </Link>
            }
            bleed
          >
            <ul className="divide-y divide-line pb-2">
              {d.upcomingRecurring.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-2.5">
                  <CategoryIcon id={r.category} size={14} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] text-ink">{r.merchant}</p>
                    <p className="text-[12px] text-muted">
                      {new Date(r.nextExpectedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  {r.status === "price_changed" && <Badge tone="warn">Price up</Badge>}
                  {r.status === "possibly_unused" && <Badge tone="info">Still using?</Badge>}
                  <span className="num text-[14px] text-ink">{formatINR(r.lastAmount)}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <div className="flex items-center justify-between gap-4 rounded-[var(--radius)] bg-ink px-6 py-5 text-bg [&_p]:text-bg [&_p+p]:opacity-70">
            <div>
              <p className="text-[14px] font-medium text-ink">Got a new statement?</p>
              <p className="text-[12.5px] text-muted">PDF, CSV or a pile of bank SMS</p>
            </div>
            <Link href="/import">
              <Button size="sm" variant="primary">
                <Upload size={14} /> Import
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
