"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Plus } from "lucide-react";
import { api } from "@/lib/client";
import { useApi } from "@/lib/use-api";
import { formatINR, formatINRCompact } from "@/lib/format";
import type { FestivalOutlook } from "@/lib/types";
import { CountUp } from "../motion";
import { Button, ErrorNote, Meter, PageHeader, Panel, Skeleton } from "../ui";

/** A diya drawn in SVG: the flame flickers (CSS), the glow breathes. */
function Diya({ size = 180 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden className="overflow-visible">
      <circle cx="100" cy="92" r="58" className="diya-glow" fill="var(--fill)" opacity="0.18" />
      <g className="diya-flame" style={{ transformOrigin: "100px 112px" }}>
        <path d="M100 52 C 116 78, 118 96, 100 112 C 82 96, 84 78, 100 52 Z" fill="var(--fill)" />
        <path d="M100 74 C 108 88, 108 98, 100 108 C 92 98, 92 88, 100 74 Z" fill="#fff4d6" />
      </g>
      <path d="M38 120 Q 100 112 162 120 Q 150 160 100 162 Q 50 160 38 120 Z" fill="var(--cat-dining)" />
      <path d="M38 120 Q 100 128 162 120" stroke="var(--ink)" strokeOpacity="0.25" strokeWidth="2" fill="none" />
      <path d="M58 140 q 10 8 20 0 q 10 8 20 0 q 10 8 20 0 q 10 8 20 0" stroke="var(--fill)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Timeline({ items }: { items: FestivalOutlook[] }) {
  const start = new Date("2026-11-01").getTime();
  const end = new Date("2027-11-01").getTime();
  const months = Array.from({ length: 12 }, (_, i) => new Date(2026, 10 + i, 1).toLocaleDateString("en-IN", { month: "short" }));
  const max = Math.max(...items.map((f) => f.estimatedSpend), 1);
  return (
    <section className="reveal rounded-[var(--radius)] bg-surface p-6 sm:p-10">
      <h2 className="font-display text-[34px] leading-none tracking-[-0.02em] sm:text-[44px]">The year ahead</h2>
      <div className="relative mt-12 h-[200px]">
        <div className="grow-line absolute bottom-8 left-0 h-[2px] w-full bg-line" />
        {items.map((f, i) => {
          const x = ((new Date(f.date).getTime() - start) / (end - start)) * 100;
          return (
            <div key={f.id + f.date} className="absolute bottom-8 flex -translate-x-1/2 flex-col items-center" style={{ left: `${Math.min(97, Math.max(3, x))}%` }}>
              <span className="mb-2 hidden whitespace-nowrap text-[13px] font-medium text-ink sm:block" style={{ transform: `translateY(${i % 2 ? -18 : 0}px)` }}>
                {f.name.split(" ")[0]}
              </span>
              <div className="grow-bar w-3 rounded-t-full bg-fill" style={{ height: `${20 + (f.estimatedSpend / max) * 110}px`, transitionDelay: `${300 + i * 90}ms` }} title={`${f.name} · ${formatINR(f.estimatedSpend)}`} />
            </div>
          );
        })}
        <div className="absolute bottom-0 flex w-full justify-between text-[13px] text-subtle">
          {months.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FestivalsView() {
  const { data, error, reload, setData } = useApi(() => api.festivals());
  if (error) return <ErrorNote error={error} retry={reload} />;
  if (!data) return <Skeleton className="h-[600px]" />;
  const next = data[0];
  const add = async (id: string, amt: number) => {
    setData(await api.addToPot(id, amt));
    toast.success(`${formatINR(amt)} added to the pot`);
  };

  return (
    <div className="space-y-16">
      <PageHeader title="Festivals" description="Diwali, weddings and Rakhi aren't surprises. Kosh plans for them months ahead, so they never derail a goal." />

      {next && (
        <section className="reveal grid items-center gap-8 overflow-hidden rounded-[var(--radius)] bg-ink p-8 text-bg sm:p-12 lg:grid-cols-[auto_1fr]">
          <div className="mx-auto">
            <Diya size={200} />
          </div>
          <div>
            <p className="text-[18px] opacity-70">Next up</p>
            <p className="mt-2 font-display text-[52px] leading-[0.98] tracking-[-0.03em] sm:text-[80px]">
              {next.name} in <CountUp value={next.daysLeft} format={(n) => `${Math.round(n)}`} /> days.
            </p>
            <p className="mt-4 text-[20px] opacity-80">
              Expect about <span className="num text-fill">{formatINR(next.estimatedSpend)}</span>. You&rsquo;ve set aside {formatINR(next.potSaved)}.
            </p>
            <div className="mt-6 max-w-md">
              <Meter value={next.potSaved / next.estimatedSpend} color="var(--fill)" className="h-2.5 bg-bg/15" />
            </div>
            <p className="mt-4 text-[17px] opacity-70">{next.goalImpact}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="primary" size="lg" onClick={() => add(next.id, 2000)}>
                <Plus size={16} /> Add ₹2,000 to the pot
              </Button>
              <Link
                href={`/planner?q=${encodeURIComponent(`What if I spend ₹${next.estimatedSpend} on ${next.name} next month?`)}`}
                className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-[16.5px] text-bg/80 underline-offset-4 hover:underline"
              >
                See it on my plan <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>
      )}

      <Timeline items={data} />

      <section>
        <h2 className="reveal font-display text-[36px] leading-none tracking-[-0.02em] sm:text-[48px]">Your festival pots</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.slice(1, 7).map((f) => (
            <Panel key={f.id + f.date} title={f.name} description={`${new Date(f.date).toLocaleDateString("en-IN", { day: "numeric", month: "long" })} · in ${f.daysLeft} days`}>
              <p className="num font-display text-[36px] leading-none">{formatINRCompact(f.estimatedSpend)}</p>
              <p className="mt-2 text-[15px] text-muted">{f.basis}</p>
              <Meter className="mt-5" value={f.potSaved / f.estimatedSpend} color="var(--fill)" />
              <div className="mt-3 flex items-center justify-between text-[15.5px]">
                <span className="text-muted">
                  Save <span className="num text-ink">{formatINR(f.monthlyToSave)}</span>/month
                </span>
                <button onClick={() => add(f.id, 1000)} className="inline-flex items-center gap-1 font-medium text-ink underline-offset-4 hover:underline">
                  <Plus size={14} /> ₹1,000
                </button>
              </div>
            </Panel>
          ))}
        </div>
      </section>
    </div>
  );
}
