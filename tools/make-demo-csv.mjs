// Generates samples/kosh-demo-statement.csv: six months (May–Oct 2026) of realistic, entirely fake
// HDFC-style statement rows for the demo persona. Deterministic (seeded), so every run is identical.
// Usage: node tools/make-demo-csv.mjs
import { writeFileSync } from "fs";

let a = 20261031;
const rand = () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (xs) => xs[Math.floor(rand() * xs.length)];
const amt = (lo, hi) => Math.round(lo + rand() * (hi - lo));
const ref = () => String(4300000000 + Math.floor(rand() * 99999999)).padStart(12, "0");

const MONTHS = [
  ["2026-05", 31],
  ["2026-06", 30],
  ["2026-07", 31],
  ["2026-08", 31],
  ["2026-09", 30],
  ["2026-10", 31],
];
const rows = [];
const add = (date, narration, debit, credit) => rows.push({ date, narration, debit, credit });

for (const [m, days] of MONTHS) {
  const d = (n) => `${m}-${String(Math.min(n, days)).padStart(2, "0")}`;
  const oct = m === "2026-10";
  const late = m >= "2026-09";
  add(d(1), "NEFT CR-ACME DESIGN LABS PVT LTD-SALARY", 0, 95000);
  add(d(2), "UPI-SUNITA RAO-sunita.rao@okhdfc-RENT", 25000, 0);
  add(d(3), "ACH D- BSE LTD MF SIP", 10000, 0);
  add(d(5), "EMI-BAJAJ FINSERV LOAN 4471", 3200, 0);
  add(d(7), "BESCOM BILL PAYMENT", amt(1050, 1700), 0);
  add(d(9), "AIRTEL POSTPAID 98XXXX4410", 599, 0);
  add(d(10), "ACT FIBERNET BROADBAND", 1059, 0);
  add(d(12), "NETFLIX.COM SI", oct ? 649 : 499, 0);
  add(d(14), "SPOTIFY INDIA", 119, 0);
  add(d(15), "DISNEY PLUS HOTSTAR", 299, 0);
  add(d(4), "CULTFIT MEMBERSHIP", 1499, 0);
  add(d(20), "APPLE.COM/BILL ICLOUD", 75, 0);
  for (const day of [4, 11, 18, 25]) add(d(day), pick(["UPI-BLINKIT-COMMERCE-blinkit@hdfcbank", "UPI-ZEPTO MARKETPLACE-zepto@ybl", "BIGBASKET SUPERMARKET"]), amt(600, 2400), 0);
  const dining = oct ? 16 : late ? 12 : 9;
  for (let i = 0; i < dining; i++)
    add(d(amt(1, days)), pick(["UPI-SWIGGY-swiggy@icici", "UPI-ZOMATO LTD-zomato@kotak", "UPI-THIRD WAVE COFFEE-twc@okaxis", "POS TOIT BREWPUB INDIRANAGAR"]), amt(220, oct ? 1450 : 900), 0);
  for (const day of [6, 18]) add(d(day), "UPI-EATCLUB BRANDS PVT-PAYTM", amt(280, 520), 0);
  add(d(22), "UPI-RAMESH KUMAR-9845XXXX12@okaxis", 1500, 0);
  for (let i = 0; i < 9; i++) {
    const [n, lo, hi] = pick([
      ["POS UBER INDIA SYSTEMS", 90, 480],
      ["UPI-OLA CABS ANI TECH-ola@ybl", 90, 420],
      ["NAMMA METRO RECHARGE", 100, 300],
      ["HPCL FUEL STATION KORAMANGALA", 800, 1500],
    ]);
    add(d(amt(1, days)), n, amt(lo, hi), 0);
  }
  for (let i = 0; i < 4; i++) add(d(amt(1, days)), pick(["AMAZON PAY INDIA", "MYNTRA DESIGNS", "FLIPKART INTERNET"]), amt(399, 3200), 0);
  add(d(amt(8, 26)), "BOOKMYSHOW", amt(350, 900), 0);
  add(d(amt(5, 25)), "APOLLO PHARMACY", amt(180, 900), 0);
  add(d(amt(10, 20)), "ATM WDL HDFC KORAMANGALA", 2000, 0);
  if (m === "2026-06") add(d(14), "MAKEMYTRIP INDIA PVT LTD", 18450, 0);
  if (m === "2026-07") add(d(28), "IMPS CR-PRIYA S-BIRTHDAY", 0, 2000);
}

rows.sort((x, y) => x.date.localeCompare(y.date));
let balance = 184250.75;
const fmt = (n) => (n ? n.toFixed(2) : "");
const ddmmyy = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;
const lines = [
  "HDFC BANK LTD,,,,,,",
  "Statement of account,,,,,,",
  "Account holder: AARAV MEHTA (demo data),,,,,,",
  "Account No: XXXXXXXX4821,,,,,,",
  "Period: 01/05/2026 to 31/10/2026,,,,,,",
  ",,,,,,",
  "Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance",
];
for (const r of rows) {
  balance = balance - r.debit + r.credit;
  const narration = r.narration.includes(",") ? `"${r.narration}"` : r.narration;
  lines.push([ddmmyy(r.date), narration, ref(), ddmmyy(r.date), fmt(r.debit), fmt(r.credit), balance.toFixed(2)].join(","));
}
lines.push(",,,,,,", `,STATEMENT SUMMARY,,,,,${balance.toFixed(2)}`);
writeFileSync("samples/kosh-demo-statement.csv", lines.join("\n") + "\n");
console.log(`wrote ${rows.length} transactions to samples/kosh-demo-statement.csv`);
