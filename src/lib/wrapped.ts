import type { Database, Wrapped, WrappedCard } from "./types";
import { getCategory, isSpendCategory } from "./categories";
import { formatINR, monthLabel } from "./format";

/** Monthly Wrapped: every number deterministic; captions are templates (an AI rewrite is optional upstream). */
export function buildWrapped(db: Database, month: string): Wrapped {
  const tx = db.transactions.filter((t) => t.date.startsWith(month));
  const debits = tx.filter((t) => t.direction === "debit" && isSpendCategory(t.category));
  const income = tx.filter((t) => t.direction === "credit").reduce((s, t) => s + t.amount, 0);
  const spend = debits.reduce((s, t) => s + t.amount, 0);
  const rate = income ? (income - spend) / income : 0;
  const name = monthLabel(month).split(" ")[0];

  const byCat = new Map<string, number>();
  const byMerchant = new Map<string, { amount: number; count: number }>();
  const byDow = new Array(7).fill(0);
  for (const t of debits) {
    byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
    if (!["rent", "emi", "utilities"].includes(t.category)) {
      const m = byMerchant.get(t.merchant) ?? { amount: 0, count: 0 };
      m.amount += t.amount;
      m.count++;
      byMerchant.set(t.merchant, m);
    }
    byDow[new Date(t.date).getDay()] += t.amount;
  }
  const cats = [...byCat].filter(([c]) => !["rent", "emi", "utilities"].includes(c)).sort((a, b) => b[1] - a[1]);
  const topCat = cats[0];
  const topByCount = [...byMerchant].sort((a, b) => b[1].count - a[1].count)[0];
  const biggest = [...debits].filter((t) => !["rent", "emi", "investments"].includes(t.category)).sort((a, b) => b.amount - a.amount)[0];
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const busiest = byDow.indexOf(Math.max(...byDow));
  const weekend = byDow[0] + byDow[6];
  const subs = db.recurring.filter((r) => r.isSubscription && r.status !== "cancelled").reduce((s, r) => s + r.lastAmount, 0);
  const food = (byCat.get("dining") ?? 0) + (byCat.get("groceries") ?? 0);
  const budgets = Object.entries(db.profile.categoryBudgets)
    .map(([c, b]) => ({ c, b: b ?? 0, s: byCat.get(c) ?? 0 }))
    .filter((x) => x.b > 0);
  const best = budgets.filter((x) => x.s <= x.b).sort((a, b) => b.b - b.s - (a.b - a.s))[0];

  const persona =
    rate >= 0.3
      ? "The Steady Saver"
      : weekend / Math.max(spend, 1) > 0.4 && (byCat.get("dining") ?? 0) > 6000
        ? "The Weekend Foodie"
        : subs > 1500
          ? "The Subscription Collector"
          : topCat?.[0] === "shopping"
            ? "The Cart Captain"
            : "The Everyday Optimist";

  const cards: WrappedCard[] = [
    { id: "intro", kicker: "Kosh Wrapped", headline: `Your ${name}, wrapped.`, caption: `${tx.length} transactions. Here's the story they tell.`, tone: "--ink" },
    {
      id: "flow",
      kicker: "In and out",
      headline: `You kept ${Math.round(rate * 100)}%`,
      value: formatINR(Math.max(0, income - spend)),
      caption: `${formatINR(income)} came in, ${formatINR(spend)} went out.`,
      tone: "--positive",
      bars: [
        { label: "In", value: income },
        { label: "Out", value: spend },
      ],
    },
    topCat && {
      id: "category",
      kicker: "Where your heart (and wallet) went",
      headline: getCategory(topCat[0] as never).label,
      value: formatINR(topCat[1]),
      caption: `Your top spend outside rent and bills.`,
      tone: "--cat-dining",
      bars: cats.slice(0, 5).map(([c, v]) => ({ label: getCategory(c as never).label.split(" ")[0], value: v })),
    },
    topByCount && {
      id: "merchant",
      kicker: "Your most visited",
      headline: topByCount[0],
      value: `${topByCount[1].count} times`,
      caption: `${formatINR(topByCount[1].amount)} in total. They probably know your order by now.`,
      tone: "--cat-shopping",
    },
    biggest && {
      id: "biggest",
      kicker: "Biggest single spend",
      headline: formatINR(biggest.amount),
      value: biggest.merchant,
      caption: `On ${new Date(biggest.date).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.`,
      tone: "--warn",
    },
    {
      id: "day",
      kicker: "Your big spending day",
      headline: `${days[busiest]}s`,
      value: formatINR(byDow[busiest]),
      caption: weekend / Math.max(spend, 1) > 0.35 ? "Weekends do the heavy lifting." : "Weekdays, mostly. Very disciplined weekends.",
      tone: "--cat-transport",
      bars: days.map((d, i) => ({ label: d.slice(0, 3), value: byDow[i] })),
    },
    {
      id: "food",
      kicker: "Food, all in",
      headline: formatINR(food),
      caption: `That's ${formatINR(Math.round(food / 30))} a day on groceries and eating out.`,
      tone: "--cat-groceries",
    },
    best && {
      id: "win",
      kicker: "Your quiet win",
      headline: getCategory(best.c as never).label,
      value: `${formatINR(best.b - best.s)} under`,
      caption: `You stayed under your ${formatINR(best.b)} budget.`,
      tone: "--positive",
    },
    {
      id: "learned",
      kicker: "Kosh learned",
      headline: `${db.rules.length} rule${db.rules.length === 1 ? "" : "s"}`,
      caption: db.rules.length ? "Every fix you made is now automatic." : "Fix one category and Kosh remembers it forever.",
      tone: "--info",
    },
    { id: "persona", kicker: `Your ${name} persona`, headline: persona, caption: "Share it. Or don't. Kosh won't judge.", tone: "--fill" },
  ].filter(Boolean) as WrappedCard[];

  return { month, persona, cards };
}
