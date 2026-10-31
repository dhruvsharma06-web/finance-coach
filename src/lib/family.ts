import type { Family, FamilySummary } from "./types";
import { addMonths } from "./format";

/** Deterministic household maths. `today` is injectable for tests. */
export function familySummary(f: Family, today = new Date("2026-10-31")): FamilySummary {
  const byId = new Map(f.members.map((m) => [m.id, m]));
  const earners = f.members.filter((m) => m.role === "earner" && m.monthlyIncome > 0);
  const totalIncome = earners.reduce((s, m) => s + m.monthlyIncome, 0);
  const dependents = f.members.length - earners.length;

  const day = today.getDate();
  const supportFlows = f.support.map((s) => ({
    ...s,
    fromName: byId.get(s.fromMemberId)?.relation ?? "?",
    toName: byId.get(s.toMemberId)?.relation ?? "?",
    daysUntil: s.day >= day ? s.day - day : new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - day + s.day,
  }));

  const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const goals = f.goals.map((g) => {
    const savedTotal = Object.values(g.saved).reduce((s, v) => s + v, 0);
    const monthlyTotal = Object.values(g.monthly).reduce((s, v) => s + v, 0);
    let reachDate: string | null = null;
    if (savedTotal >= g.targetAmount) reachDate = ym;
    else if (monthlyTotal > 0) {
      const months = Math.ceil((g.targetAmount - savedTotal) / monthlyTotal);
      if (months <= 120) reachDate = addMonths(ym, months);
    }
    return { ...g, savedTotal, monthlyTotal, reachDate, onTrack: !!reachDate && reachDate <= g.targetDate.slice(0, 7) };
  });

  return {
    totalIncome,
    earners: earners.length,
    dependents,
    dependencyRatio: earners.length ? dependents / earners.length : dependents,
    shareByEarner: earners
      .map((m) => ({ memberId: m.id, name: m.relation, income: m.monthlyIncome, pct: totalIncome ? m.monthlyIncome / totalIncome : 0 }))
      .sort((a, b) => b.income - a.income),
    monthlySupportTotal: f.support.reduce((s, x) => s + x.amount, 0),
    supportFlows: supportFlows.sort((a, b) => a.daysUntil - b.daysUntil),
    goals,
  };
}
