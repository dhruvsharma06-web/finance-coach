import type { CategoryId, CorrectionResult } from "../types";
import { newId, nowIso, updateDb } from "../db";
import { normalizeMerchant } from "../format";
import { matchRule } from "./index";

/**
 * LANE B (Codex). The correction loop:
 * user fixes a category → we learn a rule → re-apply to similar past transactions.
 * Stub: merchant_exact rule. Improve generalization (strip UPI handles / ref numbers,
 * use "contains" for chains like "swiggy instamart"), dedupe/override conflicting rules.
 */
export async function applyCorrection(
  transactionId: string,
  category: CategoryId,
  opts: { createRule?: boolean; applyToSimilar?: boolean } = {},
): Promise<CorrectionResult> {
  const { createRule = true, applyToSimilar = true } = opts;
  return updateDb((db) => {
    const txn = db.transactions.find((t) => t.id === transactionId);
    if (!txn) throw new Error("Transaction not found");
    txn.category = category;
    txn.categorySource = "user";
    txn.confidence = 1;

    if (!createRule) return { transaction: txn, rule: null, similarIds: [], appliedCount: 0 };

    const pattern = normalizeMerchant(txn.merchant);
    let rule = db.rules.find((r) => r.matchType === "merchant_exact" && r.pattern === pattern);
    if (rule) rule.category = category;
    else {
      rule = {
        id: newId(),
        pattern,
        matchType: "merchant_exact",
        category,
        createdFrom: "correction",
        exampleTransactionId: txn.id,
        createdAt: nowIso(),
        hits: 0,
      };
      db.rules.push(rule);
    }
    txn.ruleId = rule.id;
    const r = rule;

    const similar = db.transactions.filter((t) => t.id !== txn.id && t.categorySource !== "user" && matchRule(t, [r]));
    let appliedCount = 0;
    if (applyToSimilar) {
      for (const t of similar) {
        if (t.category !== category) appliedCount++;
        t.category = category;
        t.categorySource = "user_rule";
        t.confidence = 1;
        t.ruleId = r.id;
      }
      r.hits += similar.length;
    }
    return { transaction: txn, rule: r, similarIds: similar.map((t) => t.id), appliedCount };
  });
}
