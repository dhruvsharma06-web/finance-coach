import type { SplitBalances, SplitExpense, SplitMode, SplitsState } from "./types";

/** Splitwise-style balances + minimum-payments settle-up. All amounts in ₹, rounded to paise. */

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Resolve a split into rupee shares. `values` are ₹ for exact, % for percent, ignored for equal. */
export function resolveShares(amount: number, memberIds: string[], mode: SplitMode, values: Record<string, number> = {}): Record<string, number> {
  const out: Record<string, number> = {};
  if (mode === "equal") {
    const each = r2(amount / memberIds.length);
    memberIds.forEach((id, i) => (out[id] = i === memberIds.length - 1 ? r2(amount - each * (memberIds.length - 1)) : each));
    return out;
  }
  if (mode === "percent") {
    const total = memberIds.reduce((s, id) => s + (values[id] ?? 0), 0);
    if (Math.abs(total - 100) > 0.01) throw new Error("Percentages must add up to 100");
    let used = 0;
    memberIds.forEach((id, i) => {
      out[id] = i === memberIds.length - 1 ? r2(amount - used) : r2((amount * (values[id] ?? 0)) / 100);
      used += out[id];
    });
    return out;
  }
  const total = memberIds.reduce((s, id) => s + (values[id] ?? 0), 0);
  if (Math.abs(total - amount) > 0.5) throw new Error(`Exact shares add up to ₹${total}, not ₹${amount}`);
  memberIds.forEach((id) => (out[id] = r2(values[id] ?? 0)));
  return out;
}

/** Greedy: repeatedly pay the biggest debtor → biggest creditor. Gives ≤ n−1 payments. */
export function settleUp(net: Map<string, number>): { from: string; to: string; amount: number }[] {
  const debt = [...net].filter(([, v]) => v < -0.009).map(([id, v]) => ({ id, v: -v }));
  const cred = [...net].filter(([, v]) => v > 0.009).map(([id, v]) => ({ id, v }));
  const out: { from: string; to: string; amount: number }[] = [];
  while (debt.length && cred.length) {
    debt.sort((a, b) => b.v - a.v);
    cred.sort((a, b) => b.v - a.v);
    const d = debt[0];
    const c = cred[0];
    const amt = r2(Math.min(d.v, c.v));
    out.push({ from: d.id, to: c.id, amount: amt });
    d.v = r2(d.v - amt);
    c.v = r2(c.v - amt);
    if (d.v < 0.01) debt.shift();
    if (c.v < 0.01) cred.shift();
  }
  return out;
}

export function groupBalances(state: SplitsState, groupId: string): SplitBalances {
  const group = state.groups.find((g) => g.id === groupId);
  if (!group) throw new Error("Group not found");
  const net = new Map(group.members.map((m) => [m.id, 0]));
  const expenses: SplitExpense[] = state.expenses.filter((e) => e.groupId === groupId);
  for (const e of expenses) {
    net.set(e.paidBy, (net.get(e.paidBy) ?? 0) + e.amount);
    for (const [id, share] of Object.entries(e.shares)) net.set(id, (net.get(id) ?? 0) - share);
  }
  for (const s of state.settlements.filter((x) => x.groupId === groupId)) {
    net.set(s.from, (net.get(s.from) ?? 0) + s.amount);
    net.set(s.to, (net.get(s.to) ?? 0) - s.amount);
  }
  for (const [k, v] of net) net.set(k, r2(v));
  const name = (id: string) => group.members.find((m) => m.id === id)?.name ?? "?";
  return {
    group,
    balances: group.members.map((m) => ({ memberId: m.id, name: m.name, net: net.get(m.id) ?? 0 })),
    settleUp: settleUp(net).map((p) => ({ ...p, fromName: name(p.from), toName: name(p.to) })),
    myNet: net.get(state.me) ?? 0,
    total: r2(expenses.reduce((s, e) => s + e.amount, 0)),
  };
}

/** "Rohan paid 2400 for dinner, split equally" → draft expense (no AI). */
export function parseSplitText(text: string, members: { id: string; name: string }[]) {
  const s = text.toLowerCase();
  const amount = Number((s.match(/(\d[\d,]*(?:\.\d+)?)\s*(k)?/)?.[1] ?? "").replace(/,/g, "")) * (/\d\s*k\b/.test(s) ? 1000 : 1);
  const payer = members.find((m) => new RegExp(`\\b${m.name.toLowerCase()}\\b`).test(s.split(/paid|spent|gave/)[0] ?? "")) ?? (/^i\b|^me\b/.test(s) ? members[0] : undefined);
  const description = s.match(/\bfor\s+(.+?)(?:,|\bsplit\b|$)/)?.[1]?.trim();
  return { amount: amount || null, paidBy: payer?.id ?? null, description: description ? description[0].toUpperCase() + description.slice(1) : null };
}
