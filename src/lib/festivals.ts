import type { Database, FestivalOutlook } from "./types";
import { formatINR } from "./format";
import { simulate } from "./simulate";
import { latestDataMonth } from "./simulate/baseline";

/** Indian festivals Nov 2026 – Oct 2027 with a typical spend multiplier on a month's everyday spend. */
export const FESTIVALS: { id: string; name: string; date: string; weight: number; region: string }[] = [
  { id: "diwali", name: "Diwali", date: "2026-11-08", weight: 0.55, region: "Pan-India" },
  { id: "bhai-dooj", name: "Bhai Dooj", date: "2026-11-11", weight: 0.08, region: "North & West" },
  { id: "wedding-season", name: "Wedding season", date: "2026-12-05", weight: 0.4, region: "Pan-India" },
  { id: "christmas", name: "Christmas & New Year", date: "2026-12-25", weight: 0.25, region: "Pan-India" },
  { id: "sankranti", name: "Makar Sankranti / Pongal", date: "2027-01-14", weight: 0.1, region: "South & West" },
  { id: "holi", name: "Holi", date: "2027-03-22", weight: 0.12, region: "North" },
  { id: "eid", name: "Eid al-Fitr", date: "2027-03-10", weight: 0.2, region: "Pan-India" },
  { id: "rakhi", name: "Raksha Bandhan", date: "2027-08-17", weight: 0.1, region: "North & West" },
  { id: "onam", name: "Onam", date: "2027-09-12", weight: 0.15, region: "Kerala" },
  { id: "ganesh", name: "Ganesh Chaturthi", date: "2027-09-04", weight: 0.12, region: "Maharashtra" },
  { id: "navratri", name: "Navratri & Durga Puja", date: "2027-10-07", weight: 0.25, region: "Pan-India" },
  { id: "diwali-2027", name: "Diwali", date: "2027-10-29", weight: 0.55, region: "Pan-India" },
].sort((a, b) => a.date.localeCompare(b.date));

const WANTS = ["shopping", "dining", "entertainment", "travel"];

export function festivalOutlook(db: Database, today = new Date("2026-10-31")): FestivalOutlook[] {
  const latest = latestDataMonth(db.transactions);
  const months = [...new Set(db.transactions.map((t) => t.date.slice(0, 7)))].sort().slice(-3);
  const everyday =
    db.transactions.filter((t) => t.direction === "debit" && months.includes(t.date.slice(0, 7)) && WANTS.includes(t.category)).reduce((s, t) => s + t.amount, 0) /
    Math.max(months.length, 1);
  const pots = db.festivalPots ?? {};
  const base = simulate(db.profile, db.transactions, { name: "base", changes: [] });

  return FESTIVALS.filter((f) => new Date(f.date) >= today)
    .slice(0, 10)
    .map((f) => {
      const daysLeft = Math.ceil((new Date(f.date).getTime() - today.getTime()) / 86400000);
      const estimatedSpend = Math.round((Math.max(everyday, 8000) * f.weight * 2.2) / 100) * 100;
      const potSaved = pots[f.id] ?? 0;
      const monthsLeft = Math.max(1, Math.round(daysLeft / 30));
      const monthlyToSave = Math.max(0, Math.round((estimatedSpend - potSaved) / monthsLeft / 50) * 50);
      const [y, m] = latest.split("-").map(Number);
      const [fy, fm] = f.date.split("-").map(Number);
      const startMonth = Math.max(0, (fy - y) * 12 + (fm - m) - 1);
      const sim = simulate(db.profile, db.transactions, { name: f.name, changes: [{ kind: "one_time", value: Math.max(0, estimatedSpend - potSaved), startMonth }] });
      const slipped = sim.goals.filter((g, i) => (g.monthsDelta ?? 0) > 0 && base.goals[i]);
      return {
        id: f.id,
        name: f.name,
        date: f.date,
        daysLeft,
        estimatedSpend,
        basis: `About ${f.weight >= 0.4 ? "half" : f.weight >= 0.2 ? "a quarter" : "a tenth"} of a month's everyday spend, typical for ${f.region.toLowerCase()} households`,
        potSaved,
        monthlyToSave,
        goalImpact: slipped.length
          ? `Unplanned, it pushes ${slipped[0].name} back ${slipped[0].monthsDelta} month${slipped[0].monthsDelta === 1 ? "" : "s"}.`
          : `Fits without moving any goal if you set aside ${formatINR(monthlyToSave)} a month.`,
      };
    });
}
