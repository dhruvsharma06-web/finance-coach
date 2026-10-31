"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { useApi } from "@/lib/use-api";
import { addMonths, formatINR, formatINRCompact, monthLabel } from "@/lib/format";
import type { Family, FamilyMember, FamilyRole, FamilySummary } from "@/lib/types";
import { MoneyFlow, type FlowSegment } from "../money-flow";
import { CountUp } from "../motion";
import { Badge, Button, ErrorNote, PageHeader, Panel, Skeleton, cn } from "../ui";

const ROLE: Record<FamilyRole, { label: string; tone: "accent" | "neutral" | "info" | "positive" }> = {
  earner: { label: "Earning", tone: "positive" },
  dependent: { label: "Supported", tone: "neutral" },
  student: { label: "Student", tone: "info" },
  retired: { label: "Retired", tone: "accent" },
};
const EARNER_COLORS = ["--ink", "--cat-dining", "--cat-transport", "--cat-shopping", "--cat-health"];

function flow(f: Family, s: FamilySummary): FlowSegment[] {
  const byId = new Map(f.members.map((m) => [m.id, m]));
  const toEach = new Map<string, number>();
  for (const x of f.support) toEach.set(x.toMemberId, (toEach.get(x.toMemberId) ?? 0) + x.amount);
  const goalsMonthly = s.goals.reduce((t, g) => t + g.monthlyTotal, 0);
  const segs: FlowSegment[] = [...toEach].map(([id, v], i) => ({
    label: `To ${byId.get(id)?.relation ?? "?"}`,
    value: v,
    colorVar: ["--cat-education", "--cat-health", "--cat-rent", "--cat-travel"][i % 4],
  }));
  segs.push({ label: "Shared goals", value: goalsMonthly, colorVar: "--fill" });
  segs.push({ label: "Each earner's own life", value: Math.max(0, s.totalIncome - s.monthlySupportTotal - goalsMonthly), colorVar: "--positive" });
  return segs.filter((x) => x.value > 0);
}

/** Family what-ifs, computed here from the same deterministic rules as the summary. */
function scenario(f: Family, s: FamilySummary, kind: "retire" | "fees" | null) {
  if (!kind) return null;
  if (kind === "retire") {
    const papa = f.members.find((m) => m.relation.toLowerCase() === "papa") ?? f.members.find((m) => m.role === "earner" && m.relation !== "You");
    if (!papa) return null;
    const goals = s.goals.map((g) => {
      const monthly = g.monthlyTotal - (g.monthly[papa.id] ?? 0);
      const left = g.targetAmount - g.savedTotal;
      const months = monthly > 0 ? Math.ceil(left / monthly) : null;
      return { name: g.name, before: g.reachDate, after: left <= 0 ? g.reachDate : months && months <= 120 ? addMonths("2026-10", months) : null };
    });
    return {
      title: `If ${papa.relation} retires next year`,
      lines: [
        `Household income drops from ${formatINR(s.totalIncome)} to ${formatINR(s.totalIncome - papa.monthlyIncome)} (−${Math.round((papa.monthlyIncome / s.totalIncome) * 100)}%).`,
        `${formatINR(f.support.filter((x) => x.fromMemberId === papa.id).reduce((t, x) => t + x.amount, 0))} of monthly support would need a new owner.`,
      ],
      goals,
    };
  }
  return {
    title: "If Chhotu's fees go up ₹20,000 a month",
    lines: [
      `Support rises to ${formatINR(s.monthlySupportTotal + 20000)} a month, ${Math.round(((s.monthlySupportTotal + 20000) / s.totalIncome) * 100)}% of everything the family earns.`,
      "Split between the earners by income share, that's " +
        s.shareByEarner.map((e) => `${e.name} +${formatINR(Math.round((20000 * e.pct) / 100) * 100)}`).join(", ") +
        ".",
    ],
    goals: [],
  };
}

function MemberCard({ m, s, onToggle, onRemove }: { m: FamilyMember; s: FamilySummary; onToggle: () => void; onRemove: () => void }) {
  const gives = s.supportFlows.filter((x) => x.fromMemberId === m.id).reduce((t, x) => t + x.amount, 0);
  const gets = s.supportFlows.filter((x) => x.toMemberId === m.id).reduce((t, x) => t + x.amount, 0);
  return (
    <li className="reveal group rounded-[var(--radius)] bg-surface p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[30px] leading-none">{m.relation}</p>
          <p className="mt-1.5 text-[15px] text-muted">
            {m.name}
            {m.city ? ` · ${m.city}` : ""}
          </p>
        </div>
        <Badge tone={ROLE[m.role].tone}>{ROLE[m.role].label}</Badge>
      </div>
      <dl className="mt-6 space-y-1.5 text-[16px]">
        {m.monthlyIncome > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted">Earns</dt>
            <dd className="num">{m.shareDetails ? formatINR(m.monthlyIncome) : "Private"}</dd>
          </div>
        )}
        {gives > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted">Sends home</dt>
            <dd className="num">{formatINR(gives)}</dd>
          </div>
        )}
        {gets > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted">Receives</dt>
            <dd className="num">{formatINR(gets)}</dd>
          </div>
        )}
      </dl>
      <div className="mt-5 flex gap-2 opacity-70 transition-opacity group-hover:opacity-100">
        <button onClick={onToggle} className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-ink">
          {m.shareDetails ? <Eye size={14} /> : <EyeOff size={14} />} {m.shareDetails ? "Sharing details" : "Totals only"}
        </button>
        {m.relation !== "You" && (
          <button onClick={onRemove} aria-label={`Remove ${m.relation}`} className="ml-auto text-subtle hover:text-danger">
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </li>
  );
}

function AddMember({ onAdd }: { onAdd: (m: FamilyMember) => void }) {
  const [open, setOpen] = useState(false);
  const [m, setM] = useState({ name: "", relation: "", role: "earner" as FamilyRole, income: 0 });
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="reveal flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-[var(--radius)] border-2 border-dashed border-line text-[16px] text-muted hover:border-ink hover:text-ink">
        <Plus size={22} /> Add a family member
      </button>
    );
  const field = "h-11 w-full rounded-xl border border-line bg-bg px-3 text-[16px] outline-none focus:border-ink";
  return (
    <form
      className="space-y-3 rounded-[var(--radius)] bg-surface p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!m.name || !m.relation) return;
        onAdd({ id: crypto.randomUUID(), name: m.name, relation: m.relation, role: m.role, monthlyIncome: m.role === "earner" ? m.income : 0, shareDetails: true });
        setOpen(false);
        setM({ name: "", relation: "", role: "earner", income: 0 });
      }}
    >
      <input className={field} placeholder="Name" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} autoFocus />
      <input className={field} placeholder="Relation (e.g. Bhaiya)" value={m.relation} onChange={(e) => setM({ ...m, relation: e.target.value })} />
      <select className={field} value={m.role} onChange={(e) => setM({ ...m, role: e.target.value as FamilyRole })}>
        <option value="earner">Earning</option>
        <option value="dependent">Supported</option>
        <option value="student">Student</option>
        <option value="retired">Retired</option>
      </select>
      {m.role === "earner" && (
        <input className={field} inputMode="numeric" placeholder="Monthly income (₹)" value={m.income || ""} onChange={(e) => setM({ ...m, income: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Add
        </Button>
      </div>
    </form>
  );
}

export function FamilyView() {
  const { data, error, reload, setData } = useApi(() => api.family());
  const [whatIf, setWhatIf] = useState<"retire" | "fees" | null>(null);
  const segments = useMemo(() => (data ? flow(data.family, data.summary) : []), [data]);

  if (error) return <ErrorNote error={error} retry={reload} />;
  if (!data) return <Skeleton className="h-[600px]" />;
  const { family: f, summary: s } = data;
  const save = async (next: Family) => {
    try {
      setData(await api.saveFamily(next));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    }
  };
  const sc = scenario(f, s, whatIf);

  return (
    <div className="space-y-20">
      <div>
        <PageHeader title="Your family's money" description="Who earns, who is supported, and what you're building together. Each person decides what the others can see." />
        <p className="rise max-w-[24ch] font-display text-[40px] leading-[1.05] tracking-[-0.02em] [animation-delay:400ms] sm:text-[56px]">
          {f.members.length} people, {s.earners} earning. <CountUp value={s.totalIncome} format={formatINRCompact} /> comes in, and{" "}
          <CountUp value={s.monthlySupportTotal} format={formatINRCompact} /> goes out as support every month.
        </p>
      </div>

      <section>
        <h2 className="reveal font-display text-[36px] leading-none tracking-[-0.02em] sm:text-[48px]">How the household runs.</h2>
        <div className="reveal mt-8 rounded-[var(--radius)] bg-surface px-4 py-8 sm:px-8">
          <MoneyFlow income={s.totalIncome} segments={segments} height={320} />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Panel title="Who's carrying the house" description={`${s.dependents} people depend on ${s.earners} earners, a ratio of ${s.dependencyRatio.toFixed(1)}`}>
          <div className="flex h-14 w-full overflow-hidden rounded-xl">
            {s.shareByEarner.map((e, i) => (
              <div key={e.memberId} className="grow-x flex items-center justify-center text-[15px] font-semibold text-bg" style={{ width: `${e.pct * 100}%`, background: `var(${EARNER_COLORS[i % EARNER_COLORS.length]})` }}>
                {e.pct > 0.12 && `${Math.round(e.pct * 100)}%`}
              </div>
            ))}
          </div>
          <ul className="mt-5 space-y-2">
            {s.shareByEarner.map((e, i) => (
              <li key={e.memberId} className="flex items-center justify-between text-[16px]">
                <span className="flex items-center gap-2.5">
                  <span className="size-3 rounded-full" style={{ background: `var(${EARNER_COLORS[i % EARNER_COLORS.length]})` }} />
                  {e.name}
                </span>
                <span className="num text-muted">
                  <CountUp value={Math.round(e.pct * 100)} format={(n) => `${Math.round(n)}%`} /> · {f.members.find((m) => m.id === e.memberId)?.shareDetails ? formatINR(e.income) : "private"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Support this month" description={`${formatINR(s.monthlySupportTotal)} sent to family, soonest first`} bleed>
          <ul className="divide-y divide-line">
            {s.supportFlows.map((x, i) => (
              <li key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[16.5px] text-ink">
                    {x.fromName} <ArrowRight size={14} className="text-subtle" /> {x.toName}
                  </p>
                  <p className="text-[14px] text-muted">
                    {x.label ?? "Monthly support"} · {x.day}th
                  </p>
                </div>
                {x.daysUntil <= 5 && <Badge tone="warn">{x.daysUntil === 0 ? "Today" : `In ${x.daysUntil} days`}</Badge>}
                <span className="num text-[17px]">{formatINR(x.amount)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <section>
        <h2 className="reveal font-display text-[36px] leading-none tracking-[-0.02em] sm:text-[48px]">Building together.</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {s.goals.map((g) => (
            <Panel key={g.id} title={g.name} description={`Target ${formatINR(g.targetAmount)} by ${new Date(g.targetDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`} action={<Badge tone={g.onTrack ? "positive" : "warn"}>{g.onTrack ? "On track" : "Behind"}</Badge>}>
              <div className="flex items-baseline justify-between">
                <span className="num font-display text-[40px] leading-none">
                  <CountUp value={Math.round((g.savedTotal / g.targetAmount) * 100)} format={(n) => `${Math.round(n)}%`} />
                </span>
                <span className="num text-[15px] text-muted">
                  {formatINRCompact(g.savedTotal)} saved · lands {g.reachDate ? monthLabel(g.reachDate) : "beyond 10 years"}
                </span>
              </div>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-2">
                {Object.entries(g.saved).map(([id, v], i) => (
                  <div key={id} className="meter-fill h-full" style={{ width: `${(v / g.targetAmount) * 100}%`, background: `var(${EARNER_COLORS[i % EARNER_COLORS.length]})` }} />
                ))}
              </div>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
                {Object.entries(g.monthly).map(([id, v], i) => (
                  <li key={id} className="flex items-center gap-2 text-muted">
                    <span className="size-2.5 rounded-full" style={{ background: `var(${EARNER_COLORS[i % EARNER_COLORS.length]})` }} />
                    {f.members.find((m) => m.id === id)?.relation}: <span className="num text-ink">{formatINRCompact(v)}/mo</span>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      </section>

      <section className="reveal rounded-[var(--radius)] bg-ink p-6 text-bg sm:p-10">
        <h2 className="font-display text-[34px] leading-none sm:text-[44px]">Family what-if</h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {(
            [
              ["retire", "What if Papa retires next year?"],
              ["fees", "What if Chhotu's fees go up ₹20K?"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} onClick={() => setWhatIf(whatIf === k ? null : k)} className={cn("rounded-full px-4 py-2.5 text-[16px] transition-colors", whatIf === k ? "bg-fill text-fill-ink" : "bg-bg/10 hover:bg-bg/20")}>
              {label}
            </button>
          ))}
        </div>
        {sc && (
          <div className="rise mt-8 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-[22px] font-semibold">{sc.title}</p>
              <ul className="mt-3 space-y-2 text-[17px] leading-relaxed opacity-80">
                {sc.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
            {sc.goals.length > 0 && (
              <ul className="space-y-3">
                {sc.goals.map((g) => (
                  <li key={g.name} className="rounded-2xl bg-bg/10 px-5 py-4">
                    <p className="text-[17px] font-medium">{g.name}</p>
                    <p className="mt-1 text-[16px] opacity-80">
                      {g.before ? monthLabel(g.before) : "—"} → <span className="text-fill">{g.after ? monthLabel(g.after) : "out of reach"}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="reveal font-display text-[36px] leading-none tracking-[-0.02em] sm:text-[48px]">{f.name}</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {f.members.map((m) => (
            <MemberCard
              key={m.id}
              m={m}
              s={s}
              onToggle={() => save({ ...f, members: f.members.map((x) => (x.id === m.id ? { ...x, shareDetails: !x.shareDetails } : x)) })}
              onRemove={() => save({ ...f, members: f.members.filter((x) => x.id !== m.id), support: f.support.filter((x) => x.fromMemberId !== m.id && x.toMemberId !== m.id) })}
            />
          ))}
          <li>
            <AddMember onAdd={(m) => save({ ...f, members: [...f.members, m] })} />
          </li>
        </ul>
      </section>
    </div>
  );
}
