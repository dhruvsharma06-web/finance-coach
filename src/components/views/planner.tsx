"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, CalendarCheck, CalendarX, Mic, Sparkles, X } from "lucide-react";
import { api } from "@/lib/client";
import { getCategory } from "@/lib/categories";
import { addMonths, formatINR, formatINRCompact, monthLabel } from "@/lib/format";
import type { CategoryId, GoalOutcome, ScenarioChange, SimulationResult } from "@/lib/types";
import { ProjectionChart } from "../charts";
import { CountUp } from "../motion";
import { Badge, Button, PageHeader, Panel, Skeleton, cn } from "../ui";

const SUGGESTIONS = [
  "What if I cut dining out by 30%?",
  "What if my rent goes up by 3,000 from January?",
  "What if I get a 15% raise in April?",
  "What if I buy a ₹60,000 phone next month?",
];

const TUNABLE: CategoryId[] = ["dining", "shopping", "groceries", "transport", "entertainment"];

function describe(c: ScenarioChange, start?: string): string {
  const cat = c.category ? getCategory(c.category).label : c.label ?? "";
  const at = c.startMonth && start ? monthLabel(addMonths(start, c.startMonth)).replace(/ d{4}$/, "") : null;
  const when = c.startMonth ? (c.kind === "one_time" ? ` in ${at ?? `month ${c.startMonth + 1}`}` : ` from ${at ?? `month ${c.startMonth + 1}`}`) : "";
  switch (c.kind) {
    case "category_pct":
      return `${cat} ${c.value > 0 ? "+" : ""}${c.value}%${when}`;
    case "category_abs":
      return `${cat} ${c.value > 0 ? "+" : "−"}${formatINR(Math.abs(c.value))}/mo${when}`;
    case "income_pct":
      return `Income ${c.value > 0 ? "+" : ""}${c.value}%${when}`;
    case "income_abs":
      return `Income ${c.value > 0 ? "+" : "−"}${formatINR(Math.abs(c.value))}/mo${when}`;
    case "fixed_cost_abs":
      return `${c.label ?? "Fixed cost"} ${c.value > 0 ? "+" : "−"}${formatINR(Math.abs(c.value))}/mo${when}`;
    case "one_time":
      return `${c.value > 0 ? "One-off spend" : "Windfall"} ${formatINR(Math.abs(c.value))}${when}`;
    case "new_recurring":
      return `New ${formatINR(c.value)}/mo${c.label ? ` ${c.label}` : ""}${when}`;
  }
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "Not within a year";

function GoalRow({ g }: { g: GoalOutcome }) {
  const better = g.monthsDelta !== null && g.monthsDelta < 0;
  const worse = g.monthsDelta !== null && g.monthsDelta > 0;
  return (
    <li className="py-3.5 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[16px] font-medium text-ink">{g.name}</p>
        {g.onTrackScenario ? (
          <Badge tone="positive">
            <CalendarCheck size={11} /> On track
          </Badge>
        ) : (
          <Badge tone="warn">
            <CalendarX size={11} /> Behind
          </Badge>
        )}
      </div>
      <p className="num mt-1 flex flex-wrap items-center gap-x-2 text-[14.5px] text-muted">
        <span className={cn(g.baselineReachDate !== g.scenarioReachDate && "line-through decoration-subtle")}>{fmtDate(g.baselineReachDate)}</span>
        {g.baselineReachDate !== g.scenarioReachDate && (
          <>
            <ArrowRight size={12} />
            <span className={cn("font-medium", better ? "text-positive" : worse ? "text-danger" : "text-ink")}>{fmtDate(g.scenarioReachDate)}</span>
          </>
        )}
        <span className="text-subtle">· target {new Date(g.targetDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
      </p>
      {g.monthsDelta !== null && g.monthsDelta !== 0 && (
        <p className={cn("mt-1 text-[14px]", better ? "text-positive" : "text-danger")}>
          {Math.abs(g.monthsDelta)} month{Math.abs(g.monthsDelta) === 1 ? "" : "s"} {better ? "sooner" : "later"}
        </p>
      )}
    </li>
  );
}

export function PlannerView() {
  const params = useSearchParams();
  const [prompt, setPrompt] = useState(params.get("q") ?? "");
  const [changes, setChanges] = useState<ScenarioChange[]>([]);
  const [name, setName] = useState("");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const runScenario = useCallback(async (next: ScenarioChange[], scenarioName: string) => {
    setBusy(true);
    try {
      setResult(await api.simulate({ scenario: { name: scenarioName || "Custom scenario", changes: next } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't run that scenario");
    } finally {
      setBusy(false);
    }
  }, []);

  const ask = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try {
      const r = await api.simulate({ prompt: t });
      if (!r.scenario.changes.length) {
        toast.message("I couldn't turn that into numbers yet", { description: "Try “cut dining by 30%” or “rent goes up by 3,000”." });
      }
      setResult(r);
      setChanges(r.scenario.changes);
      setName(r.scenario.name);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't model that");
    } finally {
      setBusy(false);
    }
  }, []);

  // Run the ?q= what-if (from nudges / Ask bar), or a baseline so the page is never empty.
  useEffect(() => {
    const q = params.get("q");
    if (q) ask(q);
    else runScenario([], "Today's plan");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (next: ScenarioChange[]) => {
    setChanges(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => runScenario(next, name), 350);
  };

  const sliderValue = (cat: CategoryId) => changes.find((c) => c.kind === "category_pct" && c.category === cat)?.value ?? 0;
  const setSlider = (cat: CategoryId, v: number) => {
    const rest = changes.filter((c) => !(c.kind === "category_pct" && c.category === cat));
    update(v === 0 ? rest : [...rest, { kind: "category_pct", category: cat, value: v }]);
  };

  const end = result?.projected.at(-1)?.cumulativeSavings ?? 0;
  const endBase = result?.baseline.at(-1)?.cumulativeSavings ?? 0;
  const diff = end - endBase;

  return (
    <div>
      <PageHeader
        title="What if…?"
        description="Say a change in plain words. Kosh turns it into numbers, projects the next 12 months, and shows what happens to your goals."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(prompt);
        }}
        className="rounded-[var(--radius)] border border-transparent bg-surface p-3 transition-colors focus-within:border-ink"
      >
        <div className="flex items-start gap-3 px-3 pt-3">
          <Mic size={18} className="mt-1 shrink-0 text-accent" />
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(prompt);
              }
            }}
            rows={2}
            placeholder="What if rent goes up 3k?"
            className="min-w-0 flex-1 resize-none bg-transparent font-display text-[26px] leading-tight tracking-[-0.01em] outline-none placeholder:text-subtle"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-2 pb-1">
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setPrompt(s);
                  ask(s);
                }}
                className="rounded-full bg-surface-2 px-3 py-1.5 text-[14px] text-muted transition-colors hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
          <Button type="submit" variant="primary" loading={busy} disabled={!prompt.trim()}>
            <Sparkles size={15} /> Model it
          </Button>
        </div>
      </form>

      {changes.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[14.5px] text-muted">Kosh understood:</span>
          {changes.map((c, i) => (
            <span key={i} className="rise inline-flex items-center gap-1.5 rounded-full bg-accent-soft py-1 pr-1.5 pl-3 text-[14.5px] text-accent">
              {describe(c, result?.projected[0]?.month)}
              <button aria-label="Remove change" onClick={() => update(changes.filter((_, j) => j !== i))} className="rounded-full p-0.5 hover:bg-accent/15">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Panel
          title={changes.length ? "Your savings, with this change" : "Your savings on today's plan"}
          description="Cumulative savings over the next 12 months"
        >
          {!result ? (
            <Skeleton className="h-[280px]" />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="font-display text-[56px] leading-none tracking-[-0.03em] text-ink"><CountUp value={end} format={formatINRCompact} /></span>
                {changes.length > 0 && diff !== 0 && (
                  <span className={cn("num text-[15.5px] font-medium", diff > 0 ? "text-positive" : "text-danger")}>
                    {diff > 0 ? "+" : "−"}
                    {formatINR(Math.abs(diff))} vs today&rsquo;s plan
                  </span>
                )}
              </div>
              <div className={cn("transition-opacity", busy && "opacity-50")}>
                <ProjectionChart baseline={result.baseline} projected={result.projected} />
              </div>
              <div className="mt-3 flex items-center gap-5 text-[13.5px] text-muted">
                <span className="flex items-center gap-2">
                  <span className="h-0.5 w-4 rounded bg-fill" /> With change
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-0 w-4 border-t border-dashed border-subtle" /> Today&rsquo;s plan
                </span>
              </div>
              {result.summary && (
                <p className="mt-5 border-t border-line pt-4 text-[16.5px] leading-relaxed text-ink text-pretty">{result.summary}</p>
              )}
              {result.assumptions.length > 0 && (
                <p className="mt-3 text-[13.5px] text-subtle">Assumes: {result.assumptions.join(" · ")}</p>
              )}
            </>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Your goals" description="When you'd reach each one">
            {!result ? (
              <Skeleton className="h-40" />
            ) : (
              <ul className="divide-y divide-line">
                {result.goals.map((g) => (
                  <GoalRow key={g.goalId} g={g} />
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Fine-tune" description="Drag to change monthly spending">
            <ul className="space-y-4">
              {TUNABLE.map((cat) => {
                const v = sliderValue(cat);
                return (
                  <li key={cat}>
                    <div className="mb-1.5 flex justify-between text-[15px]">
                      <span className="text-ink">{getCategory(cat).label}</span>
                      <span className={cn("num", v < 0 ? "text-positive" : v > 0 ? "text-danger" : "text-muted")}>
                        {v > 0 ? "+" : ""}
                        {v}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-60}
                      max={60}
                      step={5}
                      value={v}
                      onChange={(e) => setSlider(cat, Number(e.target.value))}
                      className="w-full accent-[var(--accent)]"
                      aria-label={`${getCategory(cat).label} change`}
                    />
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
