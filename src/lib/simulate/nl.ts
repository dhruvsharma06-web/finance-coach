import type { CategoryId } from "../types";

/** Shared natural-language helpers for what-ifs, life events and the coach (no AI). */

/** "3k" → 3000, "1.2 lakh" → 120000, "₹60,000" → 60000, "2 cr" → 20000000 */
export function parseMoney(s: string): number | null {
  const m = s.match(
    /(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(hazaar|hazar|thousand|lakhs?|lac|crore|cr|k|l)?\b/i,
  );
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  const unit = (m[2] ?? "").toLowerCase();
  const mult = /^(k|thousand|hazaar|hazar)$/.test(unit)
    ? 1e3
    : /^(l|lac|lakh|lakhs)$/.test(unit)
      ? 1e5
      : /^(cr|crore)$/.test(unit)
        ? 1e7
        : 1;
  return Math.round(n * mult);
}

const WORDS: [RegExp, CategoryId][] = [
  [
    /khana bahar|bahar khana|dining|eating out|eat out|food delivery|takeout|take-out|restaurants?|swiggy|zomato|ordering in|coffee/,
    "dining",
  ],
  [/groceries|grocery|blinkit|zepto|bigbasket/, "groceries"],
  [/kapde|shopping|clothes|amazon|myntra|flipkart/, "shopping"],
  [/transport|uber|ola|cabs?|commute|auto|metro/, "transport"],
  [/fuel|petrol|diesel/, "fuel"],
  [/subscriptions?|ott|streaming|netflix|hotstar|spotify/, "subscriptions"],
  [/entertainment|movies|concerts?|going out/, "entertainment"],
  [/travel|trips?|holidays?|vacations?|flights?/, "travel"],
  [/health|gym|fitness|medical|pharmacy/, "health"],
  [/education|courses?|books/, "education"],
];

export function matchCategory(s: string): CategoryId | null {
  const t = s.toLowerCase();
  for (const [re, c] of WORDS) if (re.test(t)) return c;
  return null;
}

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

/**
 * Months from `startMonth` (YYYY-MM, month 0 of the projection) until the change begins.
 * "from January" → offset to next January, "next month" → 1, "in 3 months" → 3.
 */
export function parseStart(s: string, startMonth: string): number {
  const t = s.toLowerCase();
  if (/next month/.test(t)) return 1;
  const inN = t.match(/in (\d+) months?/);
  if (inN) return Number(inN[1]);
  const mm = t.match(
    /\b(?:from|in|starting|after|by)\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/,
  );
  if (mm) {
    const [, m0] = startMonth.split("-").map(Number);
    const target = MONTHS.indexOf(mm[1]) + 1;
    return (target - m0 + 12) % 12;
  }
  return 0;
}
