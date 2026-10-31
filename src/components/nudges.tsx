"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ArrowRight, BellRing, Sparkles, TrendingUp, X } from "lucide-react";
import type { Nudge } from "@/lib/types";
import { api } from "@/lib/client";

const STYLE: Record<Nudge["severity"], { icon: typeof BellRing; color: string; bg: string }> = {
  critical: { icon: AlertTriangle, color: "var(--danger)", bg: "var(--danger-soft)" },
  warning: { icon: TrendingUp, color: "var(--warn)", bg: "var(--warn-soft)" },
  info: { icon: BellRing, color: "var(--info)", bg: "var(--info-soft)" },
  positive: { icon: Sparkles, color: "var(--positive)", bg: "var(--positive-soft)" },
};

const RANK = { critical: 0, warning: 1, info: 2, positive: 3 } as const;

export function NudgeList({ nudges, onDismiss, limit }: { nudges: Nudge[]; onDismiss: (id: string) => void; limit?: number }) {
  const [all, setAll] = useState(false);
  if (!nudges.length) {
    return <p className="py-6 text-center text-sm text-muted">You&rsquo;re on plan. Nothing needs your attention.</p>;
  }
  const sorted = [...nudges].sort((a, b) => RANK[a.severity] - RANK[b.severity]);
  const shown = limit && !all ? sorted.slice(0, limit) : sorted;
  return (
    <>
    <ul className="divide-y divide-line">
      {shown.map((n, i) => {
        const s = STYLE[n.severity];
        const Icon = s.icon;
        return (
          <li key={n.id} className="rise group flex gap-3.5 py-4 first:pt-1 last:pb-0" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full" style={{ background: s.bg, color: s.color }}>
              <Icon size={15} strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[16px] font-medium text-ink">{n.title}</p>
                <button
                  aria-label="Dismiss"
                  onClick={async () => {
                    onDismiss(n.id);
                    await api.dismissNudge(n.id).catch(() => {});
                  }}
                  className="text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink focus:opacity-100"
                >
                  <X size={15} />
                </button>
              </div>
              <p className="mt-0.5 text-[15px] leading-relaxed text-muted">{n.body}</p>
              {n.action && (
                <Link
                  href={n.action.href}
                  className="mt-2 inline-flex items-center gap-1 text-[14.5px] font-medium text-ink underline-offset-4 hover:underline"
                >
                  {n.action.label}
                  <ArrowRight size={13} />
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
    {limit && sorted.length > limit && (
      <button onClick={() => setAll((v) => !v)} className="mt-4 text-[14.5px] font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
        {all ? "Show fewer" : `Show ${sorted.length - limit} more`}
      </button>
    )}
    </>
  );
}
