"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, History, LogOut, Mic, Plus, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { useApi } from "@/lib/use-api";
import { getCategory } from "@/lib/categories";
import { formatINR, formatINRCompact } from "@/lib/format";
import type { CategoryId, FinancialProfile, Goal } from "@/lib/types";
import { Badge, Button, ErrorNote, Meter, PageHeader, Panel, Skeleton } from "../ui";

function MoneyInput({ value, onChange, className }: { value: number; onChange: (n: number) => void; className?: string }) {
  return (
    <label className={`flex h-9 items-center gap-1 rounded-lg border border-line bg-bg px-2.5 focus-within:border-subtle ${className ?? ""}`}>
      <span className="text-[14.5px] text-subtle">₹</span>
      <input
        inputMode="numeric"
        value={value ? value.toLocaleString("en-IN") : ""}
        onChange={(e) => onChange(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
        className="num w-full min-w-0 bg-transparent text-right text-[15.5px] outline-none"
      />
    </label>
  );
}

function LifeEvent({ onApplied }: { onApplied: (p: FinancialProfile) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setBusy(true);
        try {
          const r = await api.lifeEvent(text.trim());
          onApplied(r.profile);
          toast.success("Your money model is updated", { description: r.changes.join(" · ") || undefined });
          setText("");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Couldn't apply that", { description: "Try “my rent went up to 28k from November”." });
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-[var(--radius)] bg-ink p-7 text-bg [&_.text-muted]:text-bg/70"
    >
      <p className="font-display text-[34px] leading-tight text-bg">Life changed? Just say it.</p>
      <p className="mt-1 text-[15px] text-muted">
        &ldquo;My rent went up to 28k from November&rdquo;, &ldquo;Got a raise to 1.1 lakh&rdquo;, &ldquo;Started a ₹2,000 SIP&rdquo;. Kosh updates your plan and re-projects your goals.
      </p>
      <div className="mt-4 flex items-center gap-2 rounded-full bg-bg py-1.5 pr-1.5 pl-4 text-ink">
        <Mic size={16} className="shrink-0 text-accent" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What changed?"
          className="min-w-0 flex-1 bg-transparent text-[16.5px] outline-none placeholder:text-subtle"
        />
        <Button type="submit" size="sm" variant="primary" loading={busy} disabled={!text.trim()}>
          Update plan
        </Button>
      </div>
    </form>
  );
}

function NewGoal({ onAdd }: { onAdd: (g: Goal) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState("");
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-[15px] text-muted hover:border-subtle hover:text-ink">
        <Plus size={15} /> Add a goal
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name || !amount || !date) return;
        onAdd({ id: crypto.randomUUID(), name, targetAmount: amount, currentAmount: 0, targetDate: date, priority: "medium" });
        setOpen(false);
        setName("");
        setAmount(0);
        setDate("");
      }}
      className="space-y-3 rounded-xl border border-line p-4"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Trip to Japan"
        className="h-9 w-full rounded-lg border border-line bg-bg px-3 text-[15.5px] outline-none focus:border-subtle"
      />
      <div className="grid grid-cols-2 gap-3">
        <MoneyInput value={amount} onChange={setAmount} />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 rounded-lg border border-line bg-bg px-3 text-[15.5px] outline-none focus:border-subtle"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" size="sm" variant="primary" disabled={!name || !amount || !date}>
          Add goal
        </Button>
      </div>
    </form>
  );
}

export function GoalsView() {
  const { data, error, loading, reload } = useApi(() => api.profile());
  const [p, setP] = useState<FinancialProfile | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setP(data);
  }, [data]);

  if (error) return <ErrorNote error={error} retry={reload} />;
  if (loading || !p) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-1/2" />
        <Skeleton className="h-36" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const dirty = JSON.stringify(p) !== JSON.stringify(data);
  const fixed = p.fixedCosts.reduce((s, f) => s + f.amount, 0);
  const variable = Object.values(p.categoryBudgets).reduce((s, v) => s + (v ?? 0), 0);
  const monthlyNeed = fixed - (p.fixedCosts.find((f) => f.category === "investments")?.amount ?? 0) + variable;
  const efTarget = monthlyNeed * p.emergencyFund.targetMonths;
  const efMonths = p.emergencyFund.current / Math.max(monthlyNeed, 1);
  const left = p.monthlyIncome - fixed - variable;

  const save = async (next = p) => {
    setSaving(true);
    try {
      const saved = await api.updateProfile(next);
      setP(saved);
      reload();
      toast.success("Plan saved", { description: "Nudges and projections now use your new numbers." });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Your money model"
        description="What Kosh knows about you. Every nudge, projection and review is built from this, so keep it honest."
        actions={
          dirty && (
            <>
              <Button variant="ghost" onClick={() => setP(data)}>
                Discard
              </Button>
              <Button variant="primary" loading={saving} onClick={() => save()}>
                Save changes
              </Button>
            </>
          )
        }
      />

      <LifeEvent onApplied={(np) => { setP(np); reload(); }} />

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="space-y-6">
          <Panel
            title="Monthly plan"
            description={
              <>
                <span className="num">{formatINR(left)}</span> left after costs and budgets
              </>
            }
          >
            <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
              <span className="text-[15.5px] font-medium text-ink">Take-home income</span>
              <MoneyInput className="w-36" value={p.monthlyIncome} onChange={(n) => setP({ ...p, monthlyIncome: n })} />
            </div>
            <p className="mt-4 mb-2 text-[14px] font-medium text-muted">Fixed costs · {formatINR(fixed)}</p>
            <ul className="space-y-2">
              {p.fixedCosts.map((f, i) => (
                <li key={f.id} className="flex items-center justify-between gap-4">
                  <span className="text-[15.5px] text-ink">{f.label}</span>
                  <MoneyInput
                    className="w-36"
                    value={f.amount}
                    onChange={(n) => setP({ ...p, fixedCosts: p.fixedCosts.map((x, j) => (j === i ? { ...x, amount: n } : x)) })}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-5 mb-2 text-[14px] font-medium text-muted">Spending budgets · {formatINR(variable)}</p>
            <ul className="space-y-2">
              {Object.entries(p.categoryBudgets).map(([cat, amt]) => (
                <li key={cat} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-[15.5px] text-ink">
                    <span className="size-2 rounded-full" style={{ background: getCategory(cat as CategoryId).color }} />
                    {getCategory(cat as CategoryId).label}
                  </span>
                  <MoneyInput
                    className="w-36"
                    value={amt ?? 0}
                    onChange={(n) => setP({ ...p, categoryBudgets: { ...p.categoryBudgets, [cat]: n } })}
                  />
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Emergency fund" description={`Target: ${p.emergencyFund.targetMonths} months of essential costs`}>
            <div className="flex items-baseline justify-between">
              <span className="num font-display text-[38px] leading-none text-ink">{efMonths.toFixed(1)} months</span>
              <span className="num text-[14.5px] text-muted">
                {formatINRCompact(p.emergencyFund.current)} of {formatINRCompact(efTarget)}
              </span>
            </div>
            <Meter className="mt-4" value={p.emergencyFund.current / Math.max(efTarget, 1)} color={efMonths < 3 ? "var(--warn)" : "var(--accent)"} />
            <div className="mt-4 flex items-center justify-between gap-4">
              <span className="text-[15px] text-muted">Saved so far</span>
              <MoneyInput
                className="w-36"
                value={p.emergencyFund.current}
                onChange={(n) => setP({ ...p, emergencyFund: { ...p.emergencyFund, current: n } })}
              />
            </div>
          </Panel>

          <Panel title="Goals" description="Funded in priority order after your emergency fund">
            <ul className="space-y-5">
              {p.goals.map((g) => {
                const r = g.currentAmount / g.targetAmount;
                return (
                  <li key={g.id} className="group">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[16px] font-medium text-ink">{g.name}</p>
                        <p className="num mt-0.5 text-[14px] text-muted">
                          {formatINRCompact(g.currentAmount)} of {formatINRCompact(g.targetAmount)} · by{" "}
                          {new Date(g.targetDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={g.priority === "high" ? "accent" : "neutral"}>{g.priority}</Badge>
                        <button
                          aria-label={`Remove ${g.name}`}
                          onClick={() => save({ ...p, goals: p.goals.filter((x) => x.id !== g.id) })}
                          className="text-subtle opacity-0 group-hover:opacity-100 hover:text-danger focus:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <Meter className="mt-2.5" value={r} />
                  </li>
                );
              })}
            </ul>
            <div className="mt-5">
              <NewGoal onAdd={(g) => save({ ...p, goals: [...p.goals, g] })} />
            </div>
          </Panel>

          {p.lifeEvents.length > 0 && (
            <Panel title="What's changed" description="Your plan's history">
              <ol className="space-y-3">
                {[...p.lifeEvents].reverse().map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <History size={15} className="mt-0.5 shrink-0 text-subtle" />
                    <div>
                      <p className="text-[15.5px] text-ink">{e.description}</p>
                      <p className="text-[13.5px] text-muted">{new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
        </div>
      </div>

      <YourData />
    </div>
  );
}

/** Privacy controls: export, erase, restore demo, sign out (when a passcode is set). */
function YourData() {
  const { data: session } = useApi(() => api.session().catch(() => ({ authenticated: false, required: false })));
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // /goals#your-data (from the assistant): the section renders after data loads, so scroll once it exists
  useEffect(() => {
    if (window.location.hash === "#your-data") {
      const t = setTimeout(() => document.getElementById("your-data")?.scrollIntoView({ behavior: "smooth", block: "start" }), 500);
      return () => clearTimeout(t);
    }
  }, []);

  const run = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(done);
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section id="your-data" className="reveal mt-16 scroll-mt-24 rounded-[var(--radius)] bg-surface p-6 sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-[52ch]">
          <h2 className="flex items-center gap-3 font-display text-[36px] leading-none tracking-[-0.02em] sm:text-[44px]">
            <ShieldCheck size={28} className="text-positive" /> Your data
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-muted">
            Account and card numbers are masked to the last 4 digits, statement files are read in memory and never kept, and nothing
            here is ever shared. Take a copy or erase it whenever you like.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/data/export" download>
            <Button size="lg">
              <Download size={16} /> Export everything
            </Button>
          </a>
          <Button size="lg" loading={busy === "reset"} onClick={() => run("reset", api.reset, "Demo data restored")}>
            <RotateCcw size={16} /> Restore demo
          </Button>
          {session?.required && (
            <Button size="lg" loading={busy === "logout"} onClick={() => run("logout", api.logout, "Signed out")}>
              <LogOut size={16} /> Sign out
            </Button>
          )}
        </div>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-danger-soft px-5 py-4">
        <p className="text-[16.5px] text-danger">
          {confirming ? "This erases every transaction, rule, goal and report. It can’t be undone." : "Delete all of your data from Kosh."}
        </p>
        {confirming ? (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Keep my data
            </Button>
            <Button variant="danger" loading={busy === "delete"} onClick={() => run("delete", api.deleteAllData, "Everything was deleted")}>
              <Trash2 size={15} /> Yes, delete everything
            </Button>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setConfirming(true)}>
            <Trash2 size={15} /> Delete my data
          </Button>
        )}
      </div>
    </section>
  );
}
