import type { Category, CategoryId } from "./types";

export const CATEGORIES: Category[] = [
  { id: "income", label: "Income", group: "income", color: "var(--cat-income)", icon: "ArrowDownLeft" },
  { id: "rent", label: "Rent & Housing", group: "needs", color: "var(--cat-rent)", icon: "Home" },
  { id: "groceries", label: "Groceries", group: "needs", color: "var(--cat-groceries)", icon: "ShoppingBasket" },
  { id: "dining", label: "Dining & Food Delivery", group: "wants", color: "var(--cat-dining)", icon: "UtensilsCrossed" },
  { id: "transport", label: "Transport", group: "needs", color: "var(--cat-transport)", icon: "Car" },
  { id: "fuel", label: "Fuel", group: "needs", color: "var(--cat-fuel)", icon: "Fuel" },
  { id: "shopping", label: "Shopping", group: "wants", color: "var(--cat-shopping)", icon: "ShoppingBag" },
  { id: "utilities", label: "Bills & Utilities", group: "needs", color: "var(--cat-utilities)", icon: "Zap" },
  { id: "subscriptions", label: "Subscriptions", group: "wants", color: "var(--cat-subscriptions)", icon: "Repeat" },
  { id: "entertainment", label: "Entertainment", group: "wants", color: "var(--cat-entertainment)", icon: "Clapperboard" },
  { id: "health", label: "Health", group: "needs", color: "var(--cat-health)", icon: "HeartPulse" },
  { id: "education", label: "Education", group: "needs", color: "var(--cat-education)", icon: "GraduationCap" },
  { id: "travel", label: "Travel", group: "wants", color: "var(--cat-travel)", icon: "Plane" },
  { id: "emi", label: "Loans & EMI", group: "needs", color: "var(--cat-emi)", icon: "Landmark" },
  { id: "insurance", label: "Insurance", group: "needs", color: "var(--cat-insurance)", icon: "ShieldCheck" },
  { id: "investments", label: "Savings & Investments", group: "savings", color: "var(--cat-investments)", icon: "PiggyBank" },
  { id: "transfers", label: "Transfers", group: "other", color: "var(--cat-transfers)", icon: "ArrowLeftRight" },
  { id: "cash", label: "Cash Withdrawal", group: "other", color: "var(--cat-cash)", icon: "Banknote" },
  { id: "fees", label: "Fees & Charges", group: "other", color: "var(--cat-fees)", icon: "Receipt" },
  { id: "other", label: "Other", group: "other", color: "var(--cat-other)", icon: "CircleDashed" },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: CategoryId): Category {
  return byId.get(id) ?? byId.get("other")!;
}

/** Categories that count as "spending" in totals (excludes income, transfers, investments). */
export function isSpendCategory(id: CategoryId): boolean {
  return !["income", "transfers", "investments"].includes(id);
}
