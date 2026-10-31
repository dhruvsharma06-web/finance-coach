import type {
  CategoryId,
  Database,
  FinancialProfile,
  Nudge,
  PaymentMode,
  RecurringPayment,
  Transaction,
} from "./types";

/**
 * Deterministic demo data: "Aarav", 27, product designer in Bengaluru.
 * Three months of realistic Indian transactions (Aug–Oct 2026) with
 * planted story beats for the demo:
 *  - Netflix price hike ₹499 → ₹649 in October        (price_changed alert)
 *  - Disney+ Hotstar paid monthly, no related activity (possibly_unused)
 *  - Dining spend drifts ~40% over budget in October    (overspend nudge)
 *  - "EATCLUB BRANDS" and "UPI-RAMESH KUMAR" land in "other" with low confidence
 *    → the correction-loop demo (fix one, system learns the rule, fixes the rest)
 */

// Mulberry32 — tiny seeded PRNG so the seed is identical on every machine
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONTHS = ["2026-08", "2026-09", "2026-10"] as const;
const LAST_DAY: Record<string, number> = { "2026-08": 31, "2026-09": 30, "2026-10": 31 };
const ACCOUNT = "HDFC ••4821";

export function buildSeed(): Database {
  const rand = rng(42);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const between = (lo: number, hi: number) => Math.round(lo + rand() * (hi - lo));
  const txns: Transaction[] = [];
  let n = 0;

  const add = (
    date: string,
    description: string,
    merchant: string,
    amount: number,
    category: CategoryId,
    opts: Partial<Transaction> & { mode?: PaymentMode } = {},
  ) => {
    txns.push({
      id: `seed-${String(++n).padStart(4, "0")}`,
      date,
      description,
      merchant,
      amount,
      direction: category === "income" ? "credit" : "debit",
      category,
      categorySource: "builtin",
      confidence: 0.95,
      source: "seed",
      mode: "upi",
      account: ACCOUNT,
      ...opts,
    });
  };

  for (const m of MONTHS) {
    const d = (day: number) => `${m}-${String(Math.min(day, LAST_DAY[m])).padStart(2, "0")}`;
    const isOct = m === "2026-10";

    // Income & fixed
    add(d(1), "NEFT CR-ACME DESIGN LABS PVT LTD-SALARY", "Acme Design Labs (Salary)", 95000, "income", { mode: "neft" });
    add(d(2), "UPI/DR/RENT/SUNITA RAO/HDFC", "Sunita Rao (Rent)", 25000, "rent");
    add(d(3), "ACH D- BSE LTD MF SIP", "Mutual Fund SIP", 10000, "investments", { mode: "autopay" });
    add(d(5), "EMI-BAJAJ FINSERV LOAN 4471", "Bajaj Finserv EMI", 3200, "emi", { mode: "autopay" });
    add(d(7), "BESCOM BILL PAYMENT", "BESCOM Electricity", between(1100, 1650), "utilities", { mode: "netbanking" });
    add(d(9), "AIRTEL POSTPAID 98XXXX4410", "Airtel Postpaid", 599, "utilities", { mode: "autopay" });
    add(d(10), "ACT FIBERNET BROADBAND", "ACT Fibernet", 1059, "utilities", { mode: "autopay" });

    // Subscriptions
    add(d(12), "NETFLIX.COM SI", "Netflix", isOct ? 649 : 499, "subscriptions", { mode: "card" });
    add(d(14), "SPOTIFY INDIA", "Spotify", 119, "subscriptions", { mode: "card" });
    add(d(15), "DISNEY PLUS HOTSTAR", "Disney+ Hotstar", 299, "subscriptions", { mode: "card" });
    add(d(4), "CULTFIT MEMBERSHIP", "Cult.fit", 1499, "health", { mode: "card" });
    add(d(20), "APPLE.COM/BILL ICLOUD", "iCloud+", 75, "subscriptions", { mode: "card" });

    // Groceries (weekly-ish)
    for (const day of [4, 10, 17, 24, 29]) {
      const [desc, merch] = pick([
        ["UPI-BLINKIT-COMMERCE", "Blinkit"],
        ["UPI-ZEPTO MARKETPLACE", "Zepto"],
        ["BIGBASKET SUPERMARKET", "BigBasket"],
      ] as const);
      add(d(day), desc, merch, between(650, 2400), "groceries");
    }

    // Dining — heavier in October (the drift)
    const diningCount = isOct ? 16 : 10;
    for (let i = 0; i < diningCount; i++) {
      const [desc, merch] = pick([
        ["UPI-SWIGGY-BUNDL TECHNOLOGIES", "Swiggy"],
        ["UPI-ZOMATO LTD", "Zomato"],
        ["UPI-THIRD WAVE COFFEE", "Third Wave Coffee"],
        ["POS TOIT BREWPUB INDIRANAGAR", "Toit"],
      ] as const);
      add(d(between(1, LAST_DAY[m])), desc, merch, between(220, isOct ? 1450 : 900), "dining");
    }

    // Correction-loop bait: lands in "other" with low confidence
    for (const day of [6, 18]) {
      add(d(day), "UPI-EATCLUB BRANDS PVT-PAYTM", "EatClub Brands", between(280, 520), "other", {
        categorySource: "default",
        confidence: 0.32,
      });
    }
    add(d(22), "UPI-RAMESH KUMAR-9845XXXX12-OKAXIS", "Ramesh Kumar", 1500, "other", {
      categorySource: "default",
      confidence: 0.25,
      notes: "Weekly house help — great for the correction demo",
    });

    // Transport
    for (let i = 0; i < 9; i++) {
      const [desc, merch, cat] = pick([
        ["UBER INDIA SYSTEMS", "Uber", "transport"],
        ["OLA CABS ANI TECH", "Ola", "transport"],
        ["NAMMA METRO RECHARGE", "Namma Metro", "transport"],
        ["HPCL FUEL STATION KORAMANGALA", "HPCL Fuel", "fuel"],
      ] as const);
      add(d(between(1, LAST_DAY[m])), desc, merch, cat === "fuel" ? between(800, 1500) : between(90, 480), cat);
    }

    // Shopping & misc
    for (let i = 0; i < 4; i++) {
      const [desc, merch] = pick([
        ["AMAZON PAY INDIA", "Amazon"],
        ["MYNTRA DESIGNS", "Myntra"],
        ["FLIPKART INTERNET", "Flipkart"],
      ] as const);
      add(d(between(1, LAST_DAY[m])), desc, merch, between(399, 3200), "shopping", { mode: "card" });
    }
    add(d(between(8, 26)), "BOOKMYSHOW", "BookMyShow", between(350, 900), "entertainment", { mode: "card" });
    add(d(between(5, 25)), "APOLLO PHARMACY", "Apollo Pharmacy", between(180, 900), "health");
    add(d(between(10, 20)), "ATM WDL HDFC KORAMANGALA", "ATM Withdrawal", 2000, "cash", { mode: "atm" });
  }

  txns.sort((a, b) => a.date.localeCompare(b.date));

  const idsFor = (merchant: string) => txns.filter((t) => t.merchant === merchant).map((t) => t.id);
  const sub = (
    id: string,
    merchant: string,
    category: CategoryId,
    amount: number,
    day: number,
    extra: Partial<RecurringPayment> = {},
  ): RecurringPayment => ({
    id,
    merchant,
    category,
    cadence: "monthly",
    averageAmount: amount,
    lastAmount: amount,
    lastDate: `2026-10-${String(day).padStart(2, "0")}`,
    nextExpectedDate: `2026-11-${String(day).padStart(2, "0")}`,
    transactionIds: idsFor(merchant),
    status: "active",
    isSubscription: true,
    userConfirmedInUse: null,
    confidence: 0.95,
    ...extra,
  });

  const recurring: RecurringPayment[] = [
    sub("rec-rent", "Sunita Rao (Rent)", "rent", 25000, 2, { isSubscription: false }),
    sub("rec-sip", "Mutual Fund SIP", "investments", 10000, 3, { isSubscription: false }),
    sub("rec-emi", "Bajaj Finserv EMI", "emi", 3200, 5, { isSubscription: false }),
    sub("rec-netflix", "Netflix", "subscriptions", 649, 12, {
      averageAmount: 549,
      status: "price_changed",
      priceChange: { from: 499, to: 649, pct: 30.1, date: "2026-10-12" },
    }),
    sub("rec-spotify", "Spotify", "subscriptions", 119, 14),
    sub("rec-hotstar", "Disney+ Hotstar", "subscriptions", 299, 15, { status: "possibly_unused" }),
    sub("rec-cult", "Cult.fit", "health", 1499, 4),
    sub("rec-icloud", "iCloud+", "subscriptions", 75, 20),
    sub("rec-airtel", "Airtel Postpaid", "utilities", 599, 9, { isSubscription: false }),
    sub("rec-act", "ACT Fibernet", "utilities", 1059, 10, { isSubscription: false }),
  ];
  for (const r of recurring) for (const id of r.transactionIds) {
    const t = txns.find((x) => x.id === id);
    if (t) t.recurringId = r.id;
  }

  const profile: FinancialProfile = {
    name: "Aarav",
    currency: "INR",
    monthlyIncome: 95000,
    incomeDay: 1,
    fixedCosts: [
      { id: "fc-rent", label: "Rent", amount: 25000, category: "rent" },
      { id: "fc-emi", label: "Phone EMI", amount: 3200, category: "emi" },
      { id: "fc-util", label: "Utilities & internet", amount: 3000, category: "utilities" },
      { id: "fc-sip", label: "Monthly SIP", amount: 10000, category: "investments" },
    ],
    emergencyFund: { current: 120000, targetMonths: 6 },
    categoryBudgets: {
      groceries: 7000,
      dining: 6000,
      transport: 3000,
      fuel: 2500,
      shopping: 5000,
      entertainment: 1500,
      subscriptions: 1200,
      health: 2500,
    },
    goals: [
      { id: "goal-ef", name: "Emergency fund (6 months)", targetAmount: 300000, currentAmount: 120000, targetDate: "2027-06-30", priority: "high", icon: "ShieldCheck" },
      { id: "goal-goa", name: "Goa trip with friends", targetAmount: 45000, currentAmount: 12000, targetDate: "2026-12-20", priority: "medium", icon: "Palmtree" },
      { id: "goal-laptop", name: "New MacBook", targetAmount: 160000, currentAmount: 30000, targetDate: "2027-11-30", priority: "low", icon: "Laptop" },
    ],
    lifeEvents: [{ id: "le-1", date: "2026-08-01", description: "Moved to Koramangala, rent ₹25,000" }],
    updatedAt: "2026-10-31T09:00:00.000Z",
  };

  const nudges: Nudge[] = [
    {
      id: "nudge-dining",
      type: "overspend_pace",
      severity: "warning",
      title: "Dining is running hot",
      body: "You've spent about 40% more on dining this month than your ₹6,000 plan. Most of it is Swiggy and Zomato after 9pm.",
      createdAt: "2026-10-28T10:00:00.000Z",
      relatedCategory: "dining",
      dismissed: false,
      action: { label: "Try a what-if", href: "/planner?q=what%20if%20I%20cut%20dining%20out%20by%2030%25" },
    },
    {
      id: "nudge-netflix",
      type: "price_change",
      severity: "info",
      title: "Netflix went up 30%",
      body: "Your Netflix charge rose from ₹499 to ₹649 on 12 Oct. That's ₹1,800 more a year.",
      createdAt: "2026-10-12T10:00:00.000Z",
      relatedRecurringId: "rec-netflix",
      dismissed: false,
      action: { label: "Review subscriptions", href: "/subscriptions" },
    },
    {
      id: "nudge-hotstar",
      type: "unused_subscription",
      severity: "info",
      title: "Still watching Disney+ Hotstar?",
      body: "You've paid ₹897 over 3 months. If you're not using it, cancelling saves ₹3,588 a year.",
      createdAt: "2026-10-15T10:00:00.000Z",
      relatedRecurringId: "rec-hotstar",
      dismissed: false,
      action: { label: "Review", href: "/subscriptions" },
    },
  ];

  return { version: 1, transactions: txns, rules: [], recurring, profile, nudges, reports: [] };
}

