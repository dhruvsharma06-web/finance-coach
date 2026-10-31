"use client";

import { toast } from "sonner";
import { ArrowRight, Repeat } from "lucide-react";
import { api } from "@/lib/client";
import { useApi } from "@/lib/use-api";
import { formatINR } from "@/lib/format";
import type { RecurringPayment } from "@/lib/types";
import { CategoryIcon } from "../category";
import { CountUp } from "../motion";
import { Badge, Button, Empty, ErrorNote, PageHeader, Panel, Skeleton } from "../ui";

const PER_MONTH: Record<RecurringPayment["cadence"], number> = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };
const CADENCE: Record<RecurringPayment["cadence"], string> = { weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly" };

function Row({ r, onChange }: { r: RecurringPayment; onChange: (r: RecurringPayment) => void }) {
  const patch = async (p: { userConfirmedInUse?: boolean; status?: "cancelled" | "active" }, msg: string) => {
    const optimistic = { ...r, ...p, status: p.status ?? (p.userConfirmedInUse ? "active" : r.status) } as RecurringPayment;
    onChange(optimistic);
    try {
      onChange(await api.updateRecurring(r.id, p));
      toast.success(msg);
    } catch {
      onChange(r);
      toast.error("Couldn't update that");
    }
  };
  const cancelled = r.status === "cancelled";

  return (
    <li className={`px-5 py-4 ${cancelled ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3.5">
        <CategoryIcon id={r.category} size={15} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-medium text-ink">{r.merchant}</p>
            {r.status === "price_changed" && r.priceChange && <Badge tone="warn">+{Math.round(r.priceChange.pct)}% price</Badge>}
            {r.status === "possibly_unused" && <Badge tone="info">Possibly unused</Badge>}
            {cancelled && <Badge>Marked cancelled</Badge>}
          </div>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {CADENCE[r.cadence]} · next {new Date(r.nextExpectedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ·{" "}
            {r.transactionIds.length} payments seen
          </p>
        </div>
        <div className="text-right">
          <p className="num text-[15px] text-ink">{formatINR(r.lastAmount)}</p>
          <p className="num text-[12px] text-muted">{formatINR(r.lastAmount * PER_MONTH[r.cadence] * 12)}/yr</p>
        </div>
      </div>

      {r.status === "price_changed" && r.priceChange && (
        <p className="mt-3 ml-[50px] rounded-lg bg-warn-soft px-3 py-2 text-[13px] text-warn">
          Went from <span className="num">{formatINR(r.priceChange.from)}</span> to <span className="num">{formatINR(r.priceChange.to)}</span> on{" "}
          {new Date(r.priceChange.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}. That&rsquo;s{" "}
          <span className="num">{formatINR((r.priceChange.to - r.priceChange.from) * 12 * PER_MONTH[r.cadence])}</span> more a year.
        </p>
      )}

      {r.status === "possibly_unused" && (
        <div className="mt-3 ml-[50px] flex flex-wrap items-center gap-3 rounded-lg bg-info-soft px-3 py-2">
          <p className="flex-1 text-[13px] text-info">
            Still using {r.merchant}? Cancelling saves <span className="num">{formatINR(r.lastAmount * PER_MONTH[r.cadence] * 12)}</span> a year.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => patch({ userConfirmedInUse: true }, `Got it, keeping ${r.merchant}`)}>
              Yes, keep it
            </Button>
            <Button size="sm" variant="primary" onClick={() => patch({ userConfirmedInUse: false, status: "cancelled" }, `Nice. That's ${formatINR(r.lastAmount * 12)} a year back in your plan`)}>
              No, I&rsquo;ll cancel
            </Button>
          </div>
        </div>
      )}

      {cancelled && (
        <button onClick={() => patch({ status: "active" }, "Restored")} className="mt-2 ml-[50px] text-[12.5px] text-muted underline underline-offset-4 hover:text-ink">
          Undo
        </button>
      )}
    </li>
  );
}

export function RecurringView() {
  const { data, error, loading, reload, setData } = useApi(() => api.recurring());

  if (error) return <ErrorNote error={error} retry={reload} />;
  const list = data ?? [];
  const active = list.filter((r) => r.status !== "cancelled");
  const monthly = active.reduce((s, r) => s + r.lastAmount * PER_MONTH[r.cadence], 0);
  const subs = list.filter((r) => r.isSubscription);
  const bills = list.filter((r) => !r.isSubscription);
  const flagged = list.filter((r) => r.status === "price_changed" || r.status === "possibly_unused").length;
  const onChange = (next: RecurringPayment) => setData((cur) => (cur ?? []).map((x) => (x.id === next.id ? next : x)));

  return (
    <div>
      <PageHeader
        title="Recurring payments"
        description="Kosh spots anything that repeats, so you see price hikes and subscriptions you've forgotten about."
      />

      {loading && !data ? (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-72" />
        </div>
      ) : list.length === 0 ? (
        <Panel>
          <Empty icon={<Repeat size={28} />} title="No recurring payments yet" body="Import two or more months of statements and Kosh will find them." />
        </Panel>
      ) : (
        <div className="stagger space-y-6">
          <p className="max-w-[30ch] font-display text-[34px] leading-snug text-ink">
            <CountUp value={monthly} format={formatINR} /> leaves your account every month on autopilot
            {flagged > 0 && (
              <>
                {" "}
                &mdash; <span className="text-warn">{flagged} worth a look</span>
              </>
            )}
            .
          </p>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Subscriptions" description={`${formatINR(subs.filter((r) => r.status !== "cancelled").reduce((s, r) => s + r.lastAmount * PER_MONTH[r.cadence], 0))} a month`} bleed>
              <ul className="divide-y divide-line border-t border-line">
                {subs.map((r) => (
                  <Row key={r.id} r={r} onChange={onChange} />
                ))}
              </ul>
            </Panel>
            <Panel title="Bills & commitments" description="Rent, EMIs, SIPs, utilities" bleed>
              <ul className="divide-y divide-line border-t border-line">
                {bills.map((r) => (
                  <Row key={r.id} r={r} onChange={onChange} />
                ))}
              </ul>
              <a href="/planner?q=what%20if%20I%20cancel%20my%20unused%20subscriptions" className="flex items-center gap-1 border-t border-line px-5 py-3 text-[13px] text-muted hover:text-ink">
                See what cutting subscriptions does for your goals <ArrowRight size={13} />
              </a>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
