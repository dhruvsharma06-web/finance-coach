import type { CategoryId, CategoryRule, CategorySource, Transaction } from "../types";
import { normalizeMerchant } from "../format";

/**
 * LANE B (Codex) owns lib/categorize/**.
 * Pipeline: user rules → built-in merchant rules → AI (batched) → "other".
 * Stub: user rules + built-in keyword map. Keep the exported signatures.
 */

export interface CategorizeInput {
  description: string;
  merchant: string;
  amount: number;
  direction: Transaction["direction"];
}

export interface CategorizeOutput {
  category: CategoryId;
  categorySource: CategorySource;
  confidence: number;
  ruleId?: string;
}

const BUILTIN: [RegExp, CategoryId][] = [
  [/salary|payroll/, "income"],
  [/swiggy|zomato|coffee|cafe|restaurant|brewpub|dominos|kfc|mcdonald/, "dining"],
  [/blinkit|zepto|bigbasket|dmart|instamart|grocer/, "groceries"],
  [/uber|ola|rapido|metro|irctc/, "transport"],
  [/hpcl|bpcl|iocl|petrol|fuel|shell/, "fuel"],
  [/netflix|spotify|hotstar|prime video|youtube premium|icloud|apple com bill/, "subscriptions"],
  [/amazon|flipkart|myntra|ajio|nykaa/, "shopping"],
  [/bescom|electricity|airtel|jio|vodafone|fibernet|broadband/, "utilities"],
  [/\brent\b/, "rent"],
  [/\bemi\b|loan/, "emi"],
  [/\bsip\b|mutual fund/, "investments"],
  [/pharmacy|hospital|clinic|cult/, "health"],
  [/bookmyshow|pvr|inox/, "entertainment"],
  [/atm wdl|\batm\b/, "cash"],
];

/** Categorize many transactions at once (batch AI calls here for speed). */
export async function categorizeBatch(items: CategorizeInput[], rules: CategoryRule[]): Promise<CategorizeOutput[]> {
  return items.map((it) => categorizeSync(it, rules));
}

/** Deterministic part of the pipeline (user rules + builtin). No AI. */
export function categorizeSync(it: CategorizeInput, rules: CategoryRule[]): CategorizeOutput {
  const rule = matchRule(it, rules);
  if (rule) return { category: rule.category, categorySource: "user_rule", confidence: 1, ruleId: rule.id };
  const hay = normalizeMerchant(`${it.merchant} ${it.description}`);
  for (const [re, cat] of BUILTIN) {
    if (re.test(hay)) return { category: cat, categorySource: "builtin", confidence: 0.85 };
  }
  if (it.direction === "credit") return { category: "income", categorySource: "default", confidence: 0.4 };
  return { category: "other", categorySource: "default", confidence: 0.2 };
}

export function matchRule(it: CategorizeInput, rules: CategoryRule[]): CategoryRule | undefined {
  const m = normalizeMerchant(it.merchant);
  return rules.find((r) => {
    if (r.direction && r.direction !== it.direction) return false;
    if (r.matchType === "merchant_exact") return m === r.pattern;
    if (r.matchType === "contains") return m.includes(r.pattern) || normalizeMerchant(it.description).includes(r.pattern);
    try {
      return new RegExp(r.pattern, "i").test(it.description);
    } catch {
      return false;
    }
  });
}
