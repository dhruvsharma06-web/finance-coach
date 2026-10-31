"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Check, Copy, Mic, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { useApi } from "@/lib/use-api";
import { formatINR } from "@/lib/format";
import { parseSplitText } from "@/lib/splits";
import type { SplitBalances, SplitMode } from "@/lib/types";
import { CountUp } from "../motion";
import { Badge, Button, ErrorNote, PageHeader, Panel, Skeleton, cn } from "../ui";

function AddExpense({ g, onAdded }: { g: SplitBalances["group"]; onAdded: () => void }) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState(0);
  const [paidBy, setPaidBy] = useState(g.members[0].id);
  const [mode, setMode] = useState<SplitMode>("equal");
  const [inc, setInc] = useState<string[]>(g.members.map((m) => m.id));
  const [values, setValues] = useState<Record<string, number>>({});
  const [quick, setQuick] = useState("");
  const [busy, setBusy] = useState(false);
  const field = "h-12 w-full rounded-xl border border-line bg-bg px-4 text-[16.5px] outline-none focus:border-ink";

  const applyQuick = () => {
    const d = parseSplitText(quick, g.members);
    if (d.amount) setAmount(d.amount);
    if (d.paidBy) setPaidBy(d.paidBy);
    if (d.description) setDesc(d.description);
    setMode("equal");
    if (!d.amount) toast.message("Try “Rohan paid 2400 for dinner”");
  };

  const submit = async () => {
    setBusy(true);
    try {
      await api.addSplitExpense({ groupId: g.id, description: desc, amount, paidBy, mode, memberIds: inc, values: mode === "equal" ? undefined : values });
      toast.success(`Added ${desc}`);
      setDesc("");
      setAmount(0);
      setValues({});
      setQuick("");
      onAdded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add that");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Add an expense">
      <div className="mb-5 flex items-center gap-2 rounded-full bg-bg py-1.5 pr-1.5 pl-4">
        <Mic size={16} className="shrink-0 text-accent" />
        <input value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyQuick()} placeholder="Say it: “Rohan paid 2400 for dinner”" className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-subtle" />
        <Button size="sm" onClick={applyQuick} disabled={!quick.trim()}>
          Fill
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={field} placeholder="What was it for?" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <input className={field} inputMode="decimal" placeholder="Amount (₹)" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value.replace(/[^\d.]/g, "")) || 0)} />
        <select className={field} value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
          {g.members.map((m) => (
            <option key={m.id} value={m.id}>
              Paid by {m.name}
            </option>
          ))}
        </select>
        <div className="flex rounded-xl bg-bg p-1">
          {(["equal", "exact", "percent"] as const).map((k) => (
            <button key={k} onClick={() => setMode(k)} className={cn("flex-1 rounded-lg py-2 text-[15px] capitalize", mode === k ? "bg-ink text-bg" : "text-muted")}>
              {k === "percent" ? "%" : k}
            </button>
          ))}
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {g.members.map((m) => (
          <li key={m.id} className="flex items-center gap-3">
            <button
              onClick={() => setInc(inc.includes(m.id) ? inc.filter((x) => x !== m.id) : [...inc, m.id])}
              className={cn("grid size-6 place-items-center rounded-md border", inc.includes(m.id) ? "border-ink bg-ink text-bg" : "border-line")}
              aria-label={`Include ${m.name}`}
            >
              {inc.includes(m.id) && <Check size={14} />}
            </button>
            <span className="flex-1 text-[16px]">{m.name}</span>
            {mode !== "equal" && inc.includes(m.id) && (
              <input
                inputMode="decimal"
                className="h-10 w-28 rounded-lg border border-line bg-bg px-3 text-right text-[16px] outline-none focus:border-ink"
                placeholder={mode === "percent" ? "%" : "₹"}
                value={values[m.id] ?? ""}
                onChange={(e) => setValues({ ...values, [m.id]: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })}
              />
            )}
            {mode === "equal" && inc.includes(m.id) && amount > 0 && <span className="num text-[15px] text-muted">{formatINR(amount / inc.length)}</span>}
          </li>
        ))}
      </ul>
      <Button variant="primary" size="lg" className="mt-5 w-full" loading={busy} disabled={!desc || !amount || !inc.length} onClick={submit}>
        <Plus size={16} /> Add expense
      </Button>
    </Panel>
  );
}

export function SplitsView() {
  const { data, error, reload } = useApi(() => api.splits());
  const [active, setActive] = useState<string | null>(null);

  if (error) return <ErrorNote error={error} retry={reload} />;
  if (!data) return <Skeleton className="h-[600px]" />;
  const g = data.groups.find((x) => x.group.id === active) ?? data.groups[0];
  const totalNet = data.groups.reduce((s, x) => s + x.myNet, 0);
  const expenses = data.expenses.filter((e) => e.groupId === g.group.id);
  const name = (id: string) => g.group.members.find((m) => m.id === id)?.name ?? "?";

  const settle = async (p: SplitBalances["settleUp"][number]) => {
    await api.settle({ groupId: g.group.id, from: p.from, to: p.to, amount: p.amount });
    toast.success(`Recorded: ${p.fromName} paid ${p.toName} ${formatINR(p.amount)}`);
    reload();
  };

  return (
    <div className="space-y-14">
      <div>
        <PageHeader title="Splits" description="Trips, flats and dinners. Kosh keeps the tab and works out the fewest payments to settle it." />
        <p className="rise font-display text-[40px] leading-[1.05] tracking-[-0.02em] [animation-delay:400ms] sm:text-[60px]">
          {totalNet >= 0 ? "You're owed " : "You owe "}
          <span className={totalNet >= 0 ? "text-positive" : "text-danger"}>
            <CountUp value={Math.abs(totalNet)} format={formatINR} />
          </span>
          <span className="text-muted"> across {data.groups.length} groups.</span>
        </p>
      </div>

      <div className="reveal flex flex-wrap gap-2">
        {data.groups.map((x) => (
          <button key={x.group.id} onClick={() => setActive(x.group.id)} className={cn("rounded-full px-5 py-3 text-[17px] transition-colors", x.group.id === g.group.id ? "bg-ink text-bg" : "bg-surface text-muted hover:text-ink")}>
            {x.group.name}
            <span className={cn("num ml-2 text-[15px]", x.group.id === g.group.id ? "opacity-70" : x.myNet >= 0 ? "text-positive" : "text-danger")}>
              {x.myNet >= 0 ? "+" : "−"}
              {formatINR(Math.abs(x.myNet))}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-5">
          <Panel title={`Settle ${g.group.name}`} description={g.settleUp.length ? `${g.settleUp.length} payment${g.settleUp.length > 1 ? "s" : ""} clears everything (${formatINR(g.total)} spent in total)` : "All square. Nobody owes anybody."}>
            <ul className="space-y-3">
              {g.settleUp.map((p, i) => (
                <li key={i} className="reveal flex flex-wrap items-center gap-3 rounded-2xl bg-bg px-5 py-4">
                  <span className="text-[18px] font-semibold">{p.fromName}</span>
                  <span className="relative h-[2px] w-12 overflow-hidden bg-line">
                    <span className="flow-dash absolute inset-0 bg-fill" />
                  </span>
                  <ArrowRight size={16} className="-ml-2 text-accent" />
                  <span className="text-[18px] font-semibold">{p.toName}</span>
                  <span className="num ml-auto font-display text-[26px]">{formatINR(p.amount)}</span>
                  <div className="flex w-full justify-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        navigator.clipboard?.writeText(`Hi ${p.fromName}, please pay ${formatINR(p.amount)} to ${p.toName} for ${g.group.name}. (via Kosh)`);
                        toast.success("Request copied. Paste it in WhatsApp or your UPI app.");
                      }}
                    >
                      <Copy size={14} /> Copy request
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => settle(p)}>
                      <Check size={14} /> Mark paid
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Expenses" bleed>
            <ul className="divide-y divide-line">
              {expenses.map((e) => (
                <li key={e.id} className="group flex items-center gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16.5px] text-ink">{e.description}</p>
                    <p className="text-[14px] text-muted">
                      {name(e.paidBy)} paid · {e.mode === "equal" ? `split ${Object.keys(e.shares).length} ways` : e.mode === "percent" ? "split by %" : "exact amounts"} ·{" "}
                      {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <span className="num text-[17px]">{formatINR(e.amount)}</span>
                  <button
                    aria-label="Delete expense"
                    onClick={async () => {
                      await api.deleteSplitExpense(e.id);
                      reload();
                    }}
                    className="text-subtle opacity-0 group-hover:opacity-100 hover:text-danger focus:opacity-100"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Balances">
            <ul className="space-y-4">
              {g.balances.map((b) => {
                const max = Math.max(...g.balances.map((x) => Math.abs(x.net)), 1);
                return (
                  <li key={b.memberId}>
                    <div className="mb-1.5 flex justify-between text-[16px]">
                      <span>
                        {b.name}
                        {b.memberId === data.me && <span className="text-muted"> (you)</span>}
                      </span>
                      <span className={cn("num", b.net > 0 ? "text-positive" : b.net < 0 ? "text-danger" : "text-muted")}>
                        {b.net > 0 ? "gets " : b.net < 0 ? "owes " : ""}
                        {formatINR(Math.abs(b.net))}
                      </span>
                    </div>
                    <div className="relative h-2 rounded-full bg-surface-2">
                      <div
                        className={cn("meter-fill absolute top-0 h-full rounded-full", b.net >= 0 ? "left-1/2 bg-positive" : "right-1/2 bg-danger")}
                        style={{ width: `${(Math.abs(b.net) / max) * 50}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-[14px] text-muted">
              <Badge>Fewest payments</Badge> Kosh matches the biggest debts with the biggest credits so the group pays as few times as possible.
            </p>
          </Panel>
          <AddExpense key={g.group.id} g={g.group} onAdded={reload} />
        </div>
      </div>
    </div>
  );
}
