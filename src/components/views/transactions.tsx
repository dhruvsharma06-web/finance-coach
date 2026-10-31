"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpenCheck, Mic, Search, Sparkles, Trash2, X } from "lucide-react";
import { api } from "@/lib/client";
import { useApi } from "@/lib/use-api";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { formatINR, monthLabel } from "@/lib/format";
import type { CategoryId, CorrectionResult, Transaction } from "@/lib/types";
import { CategoryIcon, CategoryPicker } from "../category";
import { Badge, Button, Empty, ErrorNote, PageHeader, Panel, Skeleton, cn } from "../ui";

const SOURCE_LABEL: Record<Transaction["source"], string> = {
  csv: "CSV",
  pdf: "PDF",
  sms: "SMS",
  manual: "Manual",
  voice: "Voice",
  seed: "Statement",
};

function SourceTag({ t }: { t: Transaction }) {
  if (t.categorySource === "user") return <Badge tone="accent">You set this</Badge>;
  if (t.categorySource === "user_rule") return <Badge tone="accent"><BookOpenCheck size={11} /> Learned rule</Badge>;
  if (t.categorySource === "ai") return <Badge tone="info"><Sparkles size={11} /> AI</Badge>;
  if (t.confidence < 0.6) return <Badge tone="warn">Needs review</Badge>;
  return null;
}

function QuickAdd({ onAdded }: { onAdded: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const t = text.trim();
        if (!t) return;
        setBusy(true);
        try {
          // Natural-language quick add (Lane B parses `text`); falls back to a simple pattern here.
          const m = t.match(/(\d[\d,]*)\s*(?:rs|₹|rupees)?\s*(?:on|at|for)\s+(.+)/i);
          const res = await fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: t,
              source: "voice",
              description: m ? m[2] : t,
              amount: m ? Number(m[1].replace(/,/g, "")) : undefined,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Couldn't add that");
          const added = data.transactions?.[0] as Transaction | undefined;
          toast.success(added ? `Added ${formatINR(added.amount)} · ${added.merchant} → ${getCategory(added.category).label}` : "Added");
          setText("");
          onAdded();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Couldn't add that", { description: "Try “spent 450 on Swiggy”" });
        } finally {
          setBusy(false);
        }
      }}
      className="flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pr-1.5 pl-4"
    >
      <Mic size={15} className="shrink-0 text-accent" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Log by voice: “spent 450 on Swiggy”"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
      />
      <Button type="submit" size="sm" variant="primary" loading={busy} disabled={!text.trim()}>
        Add
      </Button>
    </form>
  );
}

function RulesDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: rules, reload, setData } = useApi(() => api.rules(), [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/20" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="rise flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-[-12px_0_40px_-12px_rgb(0_0_0/0.2)]"
      >
        <header className="flex items-start justify-between border-b border-line px-6 py-5">
          <div>
            <h2 className="font-display text-[26px] leading-tight">What Kosh has learned</h2>
            <p className="mt-1 text-[14.5px] text-muted">Every fix you make becomes a rule for future imports.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">
          {!rules ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : rules.length === 0 ? (
            <Empty
              icon={<BookOpenCheck size={28} />}
              title="No rules yet"
              body="Change the category on any transaction and Kosh will remember it for every similar one."
            />
          ) : (
            <ul className="divide-y divide-line">
              {rules.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-6 py-3.5">
                  <CategoryIcon id={r.category} size={14} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15.5px] text-ink">
                      <span className="capitalize">{r.pattern}</span> → {getCategory(r.category).label}
                    </p>
                    <p className="text-[13.5px] text-muted">
                      {r.matchType === "contains" ? "Contains" : r.matchType === "regex" ? "Pattern" : "Exact merchant"} · used {r.hits}×
                    </p>
                  </div>
                  <button
                    aria-label="Delete rule"
                    onClick={async () => {
                      setData(rules.filter((x) => x.id !== r.id));
                      await api.deleteRule(r.id).catch(() => reload());
                    }}
                    className="text-subtle hover:text-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

export function TransactionsView() {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState("");
  const category = params.get("category") ?? "";
  const [month, setMonth] = useState("");
  const [onlyReview, setOnlyReview] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const { data, error, loading, reload, setData } = useApi(() => api.transactions(), []);

  const months = useMemo(() => [...new Set((data ?? []).map((t) => t.date.slice(0, 7)))].sort().reverse(), [data]);
  const list = useMemo(() => {
    const ql = q.toLowerCase();
    return (data ?? []).filter(
      (t) =>
        (!month || t.date.startsWith(month)) &&
        (!category || t.category === category) &&
        (!onlyReview || (t.confidence < 0.6 && t.categorySource !== "user")) &&
        (!ql || `${t.merchant} ${t.description}`.toLowerCase().includes(ql)),
    );
  }, [data, q, month, category, onlyReview]);

  const reviewCount = (data ?? []).filter((t) => t.confidence < 0.6 && t.categorySource !== "user").length;
  const total = list.filter((t) => t.direction === "debit").reduce((s, t) => s + t.amount, 0);

  const setCategoryFilter = (c: string) => {
    const p = new URLSearchParams(params.toString());
    if (c) p.set("category", c);
    else p.delete("category");
    router.replace(`/transactions${p.size ? `?${p}` : ""}`);
  };

  /** Put every touched transaction back the way it was and forget the rule. */
  const undo = async (t: Transaction, prev: CategoryId, res: CorrectionResult, before: Map<string, Transaction>) => {
    setData((cur) => (cur ?? []).map((x) => before.get(x.id) ?? x));
    try {
      if (res.rule) await api.deleteRule(res.rule.id);
      await Promise.all(
        [t.id, ...res.similarIds].map((id) => {
          const orig = before.get(id);
          return orig ? api.correct(id, id === t.id ? prev : orig.category, { createRule: false, applyToSimilar: false }) : null;
        }),
      );
      toast.message(`Undone. ${t.merchant} is back to ${getCategory(prev).label}.`);
    } catch {
      toast.error("Couldn't undo everything. Reload to see the current state.");
      reload();
    }
  };

  const correct = async (t: Transaction, next: CategoryId) => {
    const prev = t.category;
    const before = new Map((data ?? []).map((x) => [x.id, x]));
    setData((data ?? []).map((x) => (x.id === t.id ? { ...x, category: next, categorySource: "user", confidence: 1 } : x)));
    try {
      const res = await api.correct(t.id, next, { createRule: true, applyToSimilar: true });
      const changed = new Set(res.similarIds);
      setData((cur) =>
        (cur ?? []).map((x) =>
          x.id === t.id ? res.transaction : changed.has(x.id) ? { ...x, category: next, categorySource: "user_rule", confidence: 1 } : x,
        ),
      );
      setFlashIds(new Set([t.id, ...res.similarIds]));
      setTimeout(() => setFlashIds(new Set()), 2300);
      toast.success(`Learned: ${t.merchant} → ${getCategory(next).label}`, {
        description:
          res.appliedCount > 0
            ? `Also updated ${res.appliedCount} similar transaction${res.appliedCount > 1 ? "s" : ""}. Future imports will follow this rule.`
            : "Future imports from this merchant will follow this rule.",
        action: { label: "Undo", onClick: () => undo(t, prev, res, before) },
        cancel: { label: "Rules", onClick: () => setRulesOpen(true) },
      });
    } catch (e) {
      setData((cur) => (cur ?? []).map((x) => (x.id === t.id ? { ...x, category: prev } : x)));
      toast.error(e instanceof Error ? e.message : "Couldn't update category");
    }
  };

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Fix any category and Kosh learns the rule, applies it to similar past transactions, and uses it on every future import."
        actions={
          <Button onClick={() => setRulesOpen(true)}>
            <BookOpenCheck size={15} /> Learned rules
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_minmax(320px,420px)]">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-full border border-line bg-surface px-4">
            <Search size={15} className="text-subtle" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search merchant or narration"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
            />
          </label>
          <select
            value={category}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none"
          >
            <option value="">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
          {reviewCount > 0 && (
            <button
              onClick={() => setOnlyReview((v) => !v)}
              className={cn(
                "h-10 rounded-full border px-4 text-sm transition-colors",
                onlyReview ? "border-warn bg-warn-soft text-warn" : "border-dashed border-warn/50 text-warn hover:bg-warn-soft",
              )}
            >
              {reviewCount} need review
            </button>
          )}
        </div>
        <QuickAdd onAdded={reload} />
      </div>

      {error && <ErrorNote error={error} retry={reload} />}

      <Panel bleed>
        <div className="flex items-center justify-between border-b border-line px-5 py-3 text-[14.5px] text-muted">
          <span>{loading ? "Loading…" : `${list.length} transactions`}</span>
          <span className="num">
            Spent <span className="text-ink">{formatINR(total)}</span>
          </span>
        </div>
        {loading && !data ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <Empty icon={<Search size={26} />} title="Nothing matches" body="Try a different search or clear the filters." />
        ) : (
          <ul className="divide-y divide-line">
            {list.slice(0, 300).map((t) => (
              <li
                key={t.id}
                className={cn(
                  "grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3 sm:grid-cols-[auto_minmax(0,1fr)_200px_auto]",
                  flashIds.has(t.id) && "flash",
                )}
              >
                <CategoryIcon id={t.category} size={14} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[16px] font-medium text-ink">{t.merchant}</p>
                    <SourceTag t={t} />
                  </div>
                  <p className="truncate text-[14px] text-muted">
                    {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {SOURCE_LABEL[t.source]}
                    {t.mode ? ` · ${t.mode.toUpperCase()}` : ""} · <span className="text-subtle">{t.description}</span>
                  </p>
                </div>
                <div className="col-span-3 col-start-2 sm:col-span-1 sm:col-start-auto">
                  <CategoryPicker
                    value={t.category}
                    needsReview={t.confidence < 0.6 && t.categorySource !== "user"}
                    onChange={(c) => correct(t, c)}
                  />
                </div>
                <span
                  className={cn(
                    "num row-start-1 text-right text-[16px] col-start-3 sm:col-start-auto sm:row-start-auto",
                    t.direction === "credit" ? "text-positive" : "text-ink",
                  )}
                >
                  {t.direction === "credit" ? "+" : "−"}
                  {formatINR(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <RulesDrawer open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}
