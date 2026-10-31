import type { CategoryId } from "../types";
const groups: [CategoryId, string][] = [
  [
    "dining",
    "Swiggy:swiggy,bundl|Zomato|Dominos|Starbucks|Third Wave|Chaayos|KFC|McDonalds:mcdonald|Pizza Hut|Subway",
  ],
  [
    "groceries",
    "Swiggy Instamart:instamart|Blinkit:blinkit,grofers|Zepto|BigBasket:bigbasket,big basket|DMart:dmart,d mart|Dunzo|Licious|FreshToHome",
  ],
  ["transport", "Uber|Ola|Rapido|IRCTC|Metro"],
  [
    "shopping",
    "Amazon:amazon,amzn|Flipkart|Myntra|Ajio|Nykaa|Reliance|Croma|Decathlon|IKEA|Urban Company",
  ],
  [
    "subscriptions",
    "Amazon Prime:amazon prime,prime video|Netflix|Spotify|Disney+ Hotstar:hotstar,disney|YouTube Premium:youtube|iCloud+:icloud|Apple|Google|JioSaavn",
  ],
  [
    "utilities",
    "Airtel|Jio|Vi:vodafone,vi|BESCOM|Tata Power|ACT Fibernet:act,fibernet|BSNL",
  ],
  ["health", "Cult.fit:cultfit,cult fit,cult|Apollo|PharmEasy|1mg|Practo"],
  ["entertainment", "BookMyShow|PVR:pvr,inox"],
  ["investments", "Zerodha|Groww"],
  ["insurance", "LIC|HDFC Life"],
  ["transfers", "CRED|Paytm|PhonePe"],
  ["fuel", "Shell|HPCL|BPCL|IOCL"],
  ["travel", "MakeMyTrip:makemytrip,make my trip|Indigo|Air India|OYO|Goibibo"],
  ["education", "Udemy|Coursera"],
  ["emi", "Bajaj Finserv EMI:bajaj finserv"],
  ["other", "EatClub Brands:eatclub,eat club"],
];
export const KNOWN_MERCHANTS = groups
  .flatMap(([category, entries]) =>
    entries.split("|").map((entry) => {
      const [name, aliases] = entry.split(":");
      return {
        name,
        category,
        aliases: (aliases || name.toLowerCase()).split(","),
      };
    }),
  )
  .sort(
    (a, b) =>
      Math.max(...b.aliases.map((x) => x.length)) -
      Math.max(...a.aliases.map((x) => x.length)),
  );
export function knownMerchant(text: string) {
  const hay = " " + text.toLowerCase().replace(/[^a-z0-9]+/g, " ") + " ";
  return KNOWN_MERCHANTS.find((m) =>
    m.aliases.some((a) => hay.includes(" " + a + " ")),
  );
}
export function cleanMerchant(description: string): string {
  if (/\batm\b/i.test(description)) return "ATM Withdrawal";
  if (/\b(?:mf\s+sip|mutual fund|sip)\b/i.test(description))
    return "Mutual Fund SIP";
  const known = knownMerchant(description);
  if (known && !["Paytm", "PhonePe", "CRED"].includes(known.name))
    return known.name;
  const salary = /salary|payroll/i.test(description);
  const clean = description
    .replace(/\b[\w.\d]+@[\w.]+\b/g, " ")
    .replace(/\b\w*X{2,}\w*\b/gi, " ")
    .replace(/\b\d{6,}\b/g, " ")
    .replace(
      /\b(?:UPI|POS|NEFT|IMPS|ACH|NACH|BIL|INF|DR|CR|D|YESB|HDFC|ICIC|ICICI|UTIB|PVT|LTD|LIMITED|INDIA|TECHNOLOGIES|SALARY|PAYROLL)\b/gi,
      " ",
    )
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return (clean || known?.name || "Unknown") + (salary ? " (Salary)" : "");
}
