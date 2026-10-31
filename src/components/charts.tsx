"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProjectionPoint } from "@/lib/types";
import { formatINR, formatINRCompact, monthLabel } from "@/lib/format";

const axis = { fontSize: 11, fill: "var(--subtle)" };

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] shadow-[0_8px_24px_-6px_rgb(0_0_0/0.18)]">{children}</div>
  );
}

export function DailySpendChart({ data, height = 140 }: { data: { date: string; amount: number }[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap={2}>
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => String(Number(d.slice(8)))}
          interval={6}
          tick={axis}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide domain={[0, max * 1.1]} />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={({ active, payload }) =>
            active && payload?.[0] ? (
              <TipBox>
                <div className="text-muted">
                  {new Date(String(payload[0].payload.date)).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </div>
                <div className="num font-medium text-ink">{formatINR(Number(payload[0].value))}</div>
              </TipBox>
            ) : null
          }
        />
        <Bar dataKey="amount" fill="var(--ink)" radius={[2, 2, 0, 0]} animationDuration={1100} animationEasing="ease-out" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProjectionChart({
  baseline,
  projected,
  height = 280,
}: {
  baseline: ProjectionPoint[];
  projected: ProjectionPoint[];
  height?: number;
}) {
  const data = baseline.map((b, i) => ({
    month: b.month,
    baseline: b.cumulativeSavings,
    scenario: projected[i]?.cumulativeSavings ?? null,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis
          dataKey="month"
          tickFormatter={(m: string) => monthLabel(m).slice(0, 3)}
          tick={axis}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tickFormatter={(v: number) => formatINRCompact(v)} tick={axis} axisLine={false} tickLine={false} width={56} />
        <Tooltip
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TipBox>
                <div className="mb-1 text-muted">{monthLabel(String(label))}</div>
                {payload.map((p) => (
                  <div key={String(p.dataKey)} className="flex items-center justify-between gap-6">
                    <span className="text-muted">{p.dataKey === "scenario" ? "With change" : "Today's plan"}</span>
                    <span className="num font-medium text-ink">{formatINR(Number(p.value))}</span>
                  </div>
                ))}
              </TipBox>
            ) : null
          }
        />
        <Area type="monotone" dataKey="baseline" stroke="var(--subtle)" strokeDasharray="4 4" strokeWidth={1.5} fill="none" />
        <Area type="monotone" dataKey="scenario" stroke="var(--fill)" strokeWidth={2.5} fill="var(--fill)" fillOpacity={0.12} animationDuration={1400} animationEasing="ease-out" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
