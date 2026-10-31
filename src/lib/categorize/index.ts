import type {
  CategoryId,
  CategoryRule,
  CategorySource,
  Transaction,
} from "../types";
import { normalizeMerchant } from "../format";
import { knownMerchant } from "../ingest/merchant";
import { aiAvailable, aiObject } from "../ai";
import { CATEGORY_IDS, CATEGORIES } from "../categories";
import { z } from "zod";
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
export async function categorizeBatch(
  items: CategorizeInput[],
  rules: CategoryRule[],
): Promise<CategorizeOutput[]> {
  const outputs = items.map((it) => categorizeSync(it, rules));
  const unknown = items
    .map((it, index) => ({ ...it, index }))
    .filter((it) => outputs[it.index].categorySource === "default");
  if (aiAvailable())
    for (let start = 0; start < unknown.length; start += 60) {
      const chunk = unknown.slice(start, start + 60),
        indices = new Set(chunk.map((it) => it.index));
      try {
        const response = await aiObject({
          schema: z.object({
            results: z.array(
              z.object({
                index: z.number().int(),
                category: z.enum(CATEGORY_IDS),
                confidence: z.number().min(0).max(1),
              }),
            ),
          }),
          system:
            "Classify Indian bank transactions. Respect debit/credit directions; refunds are not salary. Unknown people-to-people UPI are transfers. Categories: " +
            CATEGORIES.map(
              (c) => c.id + ": " + c.label + " (" + c.group + ")",
            ).join("; "),
          prompt: JSON.stringify(chunk),
        });
        for (const r of response.results)
          if (indices.has(r.index))
            outputs[r.index] = {
              category: r.category,
              confidence: r.confidence,
              categorySource: "ai",
            };
      } catch {
        /* Classification failure must not fail import. */
      }
    }
  return outputs;
}
export function categorizeSync(
  it: CategorizeInput,
  rules: CategoryRule[],
): CategorizeOutput {
  const rule = matchRule(it, rules);
  if (rule)
    return {
      category: rule.category,
      categorySource: "user_rule",
      confidence: 1,
      ruleId: rule.id,
    };
  const hay = normalizeMerchant(it.merchant + " " + it.description);
  let category: CategoryId | undefined;
  if (it.direction === "credit" && /salary|payroll/.test(hay))
    category = "income";
  else if (/\brent\b/.test(hay)) category = "rent";
  else if (/\bemi\b|loan/.test(hay)) category = "emi";
  else if (/\bsip\b|mutual fund/.test(hay)) category = "investments";
  else if (/\batm\b/.test(hay)) category = "cash";
  else if (/service charge|bank fee|late fee/.test(hay)) category = "fees";
  else {
    const known = knownMerchant(it.merchant) ?? knownMerchant(it.description);
    if (known && known.category !== "other") category = known.category;
  }
  if (category)
    return { category, categorySource: "builtin", confidence: 0.95 };
  if (
    /upi/i.test(it.description) &&
    /^[A-Za-z]+(?: [A-Za-z]+){1,3}$/.test(it.merchant) &&
    !knownMerchant(it.merchant)
  )
    return {
      category: "transfers",
      categorySource: "builtin",
      confidence: 0.5,
    };
  return { category: "other", categorySource: "default", confidence: 0.2 };
}
export function matchRule(
  it: CategorizeInput,
  rules: CategoryRule[],
): CategoryRule | undefined {
  const rank = { merchant_exact: 3, contains: 2, regex: 1 };
  const sorted = [...rules].sort(
    (a, b) =>
      rank[b.matchType] - rank[a.matchType] ||
      b.pattern.length - a.pattern.length ||
      b.createdAt.localeCompare(a.createdAt),
  );
  const m = normalizeMerchant(it.merchant);
  return sorted.find((r) => {
    if (r.direction && r.direction !== it.direction) return false;
    if (r.matchType === "merchant_exact")
      return m === normalizeMerchant(r.pattern);
    if (r.matchType === "contains")
      return m.includes(normalizeMerchant(r.pattern));
    try {
      return new RegExp(r.pattern, "i").test(it.description);
    } catch {
      return false;
    }
  });
}
