import type { CategoryId, Database, Nudge } from "../types";
import { updateDb } from "../db";
import { getCategory, isSpendCategory } from "../categories";
import { addMonths, formatINR } from "../format";
import { simulate } from "../simulate";
import { buildBaseline, latestDataMonth } from "../simulate/baseline";

/**
 * Nudges after every import and on GET /api/nudges. "Now" is the latest month with data.
 * Deduped by type + subject + month, so a dismissed nudge never comes back the same month.
 * Returns only the nudges created by this call.
 */

const PER_YEAR = { weekly: 52, monthly: 12, quarterly: 4, yearly: 1 } as const;

function monthProgress(db: Database, month: string): number {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  const today = new Date();
  if (today.toISOString().slice(0, 7) === month) return Math.max(0.1, today.getDate() / days);
  const lastDay = Math.max(...db.transactions.filter((t) => t.date.startsWith(month)).map((t) => Number(t.date.slice(8))), 1);
  return Math.max(0.1, Math.min(1, lastDay / days));
}

export function computeNudges(db: Database): Omit<Nudge, "id" | "createdAt" | "dismissed">[] {
  const month = latestDataMonth(db.transactions);
  const prev = addMonths(month, -1);
  const progress = monthProgress(db, month);
  const out: Omit<Nudge, "id" | "createdAt" | "dismissed">[] = [];

  const spend = (m: string) => {
    const map = new Map<CategoryId, { total: number; merchants: Map<string, number> }>();
    for (const t of db.transactions) {
      if (!t.date.startsWith(m) || t.direction !== "debit" || !isSpendCategory(t.category)) continue;
      const e = map.get(t.category) ?? { total: 0, merchants: new Map() };
      e.total += t.amount;
      e.merchants.set(t.merchant, (e.merchants.get(t.merchant) ?? 0) + t.amount);
      map.set(t.category, e);
    }
    return map;
  };
  const cur = spend(month);
  const before = spend(prev);

  // Drift off plan
  for (const [cat, budget] of Object.entries(db.profile.categoryBudgets) as [CategoryId, number][]) {
    if (!budget) continue;
    const e = cur.get(cat);
    const spent = e?.total ?? 0;
    const pace = spent / (budget * progress);
    const label = getCategory(cat).label;
    if (pace > 1.15 && e) {
      const top = [...e.merchants.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([n]) => n);
      const over = Math.round(spent - budget * progress);
      out.push({
        type: "overspend_pace",
        severity: pace > 1.4 ? "critical" : "warning",
        title: `${label.split(" ")[0]} is running hot`,
        body: `You're ${formatINR(over)} ahead of your ${formatINR(budget)} ${label.toLowerCase()} plan${progress < 1 ? " for this point in the month" : ""}. Most of it went to ${top.join(" and ")}.`,
        relatedCategory: cat,
        action: { label: "Try a what-if", href: `/planner?q=${encodeURIComponent(`What if I cut ${label.split(" ")[0].toLowerCase()} by 30%?`)}` },
      });
    } else if (progress >= 0.7 && spent <= budget * 0.8 && spent > 0) {
      out.push({
        type: "positive",
        severity: "positive",
        title: `${label.split(" ")[0]} is under control`,
        body: `${formatINR(spent)} of your ${formatINR(budget)} ${label.toLowerCase()} budget used, ${formatINR(budget - spent)} to spare.`,
        relatedCategory: cat,
      });
    }
  }

  // Subscriptions
  for (const r of db.recurring) {
    if (r.status === "cancelled") continue;
    const yearly = PER_YEAR[r.cadence];
    if (r.priceChange && r.status === "price_changed") {
      const up = r.priceChange.to > r.priceChange.from;
      out.push({
        type: "price_change",
        severity: up ? "info" : "positive",
        title: `${r.merchant} went ${up ? "up" : "down"} ${Math.abs(Math.round(r.priceChange.pct))}%`,
        body: `Your ${r.merchant} charge changed from ${formatINR(r.priceChange.from)} to ${formatINR(r.priceChange.to)}. That's ${formatINR(Math.abs(r.priceChange.to - r.priceChange.from) * yearly)} ${up ? "more" : "less"} a year.`,
        relatedRecurringId: r.id,
        action: { label: "Review subscriptions", href: "/subscriptions" },
      });
    }
    if (r.status === "possibly_unused" && r.userConfirmedInUse === null) {
      out.push({
        type: "unused_subscription",
        severity: "info",
        title: `Still using ${r.merchant}?`,
        body: `You've paid ${formatINR(r.lastAmount * r.transactionIds.length)} over ${r.transactionIds.length} charges. Cancelling saves ${formatINR(r.lastAmount * yearly)} a year.`,
        relatedRecurringId: r.id,
        action: { label: "Review", href: "/subscriptions" },
      });
    }
    if ((r as { isNewSubscription?: boolean }).isNewSubscription) {
      out.push({
        type: "new_subscription",
        severity: "info",
        title: `New subscription: ${r.merchant}`,
        body: `${formatINR(r.lastAmount)} every ${r.cadence.replace("ly", "")}, or ${formatINR(r.lastAmount * yearly)} a year. Make sure you meant to sign up.`,
        relatedRecurringId: r.id,
        action: { label: "Review", href: "/subscriptions" },
      });
    }
  }

  // Goals + buffer
  const sim = simulate(db.profile, db.transactions, { name: "Today's plan", changes: [] });
  for (const g of sim.goals.filter((x) => !x.onTrackBaseline).slice(0, 2)) {
    const by = new Date(g.targetDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    out.push({
      type: "goal_at_risk",
      severity: "warning",
      title: `${g.name} is slipping`,
      body: g.baselineReachDate
        ? `At today's pace you'd get there by ${new Date(g.baselineReachDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}, after your ${by} target.`
        : `At today's pace you won't reach it within three years. Your target is ${by}.`,
      relatedGoalId: g.goalId,
      action: { label: "Find the money", href: `/planner?q=${encodeURIComponent("What if I cut dining out by 30% and shopping by 20%?")}` },
    });
  }
  const b = buildBaseline(db.profile, db.transactions);
  if (b.emergencyFundMonths < 3) {
    out.push({
      type: "low_buffer",
      severity: "warning",
      title: "Your safety net is thin",
      body: `Your emergency fund covers about ${b.emergencyFundMonths.toFixed(1)} months of essentials. Three to six months is a common cushion.`,
      action: { label: "See your money model", href: "/goals" },
    });
  }

  // Savings rate trend
  const inc = (m: string) => db.transactions.filter((t) => t.date.startsWith(m) && t.direction === "credit").reduce((s, t) => s + t.amount, 0);
  const tot = (m: Map<CategoryId, { total: number }>) => [...m.values()].reduce((s, e) => s + e.total, 0);
  const rateNow = inc(month) ? (inc(month) - tot(cur)) / inc(month) : 0;
  const ratePrev = inc(prev) ? (inc(prev) - tot(before)) / inc(prev) : 0;
  if (inc(prev) && rateNow > ratePrev + 0.03) {
    out.push({
      type: "positive",
      severity: "positive",
      title: "You saved more than last month",
      body: `Your savings rate is ${Math.round(rateNow * 100)}%, up from ${Math.round(ratePrev * 100)}%.`,
    });
  }
  return out;
}

const keyOf = (n: Pick<Nudge, "type" | "relatedCategory" | "relatedRecurringId" | "relatedGoalId">, month: string) =>
  [n.type, n.relatedCategory ?? n.relatedRecurringId ?? n.relatedGoalId ?? "", month].join(":");

export async function generateNudges(): Promise<Nudge[]> {
  return updateDb((db) => {
    const month = latestDataMonth(db.transactions);
    const existing = new Set(db.nudges.map((n) => keyOf(n, n.createdAt.slice(0, 7) <= month ? month : n.createdAt.slice(0, 7))));
    // seed / earlier nudges for this month count as existing regardless of createdAt day
    for (const n of db.nudges) existing.add(keyOf(n, month));
    const fresh: Nudge[] = [];
    for (const n of computeNudges(db)) {
      const k = keyOf(n, month);
      if (existing.has(k)) continue;
      existing.add(k);
      fresh.push({ ...n, id: k, createdAt: new Date().toISOString(), dismissed: false });
    }
    db.nudges.push(...fresh);
    return fresh;
  });
}
