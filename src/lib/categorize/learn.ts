import type {
  CategoryId,
  CategoryRule,
  CorrectionResult,
  Transaction,
} from "../types";
import { newId, nowIso, readDb, updateDb } from "../db";
import { normalizeMerchant } from "../format";
import { knownMerchant } from "../ingest/merchant";
import { matchRule } from "./index";
function proposedRule(txn: Transaction, category: CategoryId): CategoryRule {
  const merchant = normalizeMerchant(txn.merchant),
    known = knownMerchant(txn.merchant);
  const token = known?.aliases.find(
    (a) => a.length >= 4 && merchant.includes(a),
  );
  return {
    id: newId(),
    pattern: token ?? merchant,
    matchType: token ? "contains" : "merchant_exact",
    category,
    direction: txn.direction,
    createdFrom: "correction",
    exampleTransactionId: txn.id,
    createdAt: nowIso(),
    hits: 0,
  };
}
export async function similarPreview(
  transactionId: string,
): Promise<{ similarIds: string[]; count: number }> {
  const db = await readDb(),
    txn = db.transactions.find((t) => t.id === transactionId);
  if (!txn) throw new Error("Transaction not found");
  const rule = proposedRule(txn, txn.category);
  const competing = db.rules.filter(
    (r) =>
      !(
        r.pattern === rule.pattern &&
        r.matchType === rule.matchType &&
        r.direction === rule.direction
      ),
  );
  const similarIds = db.transactions
    .filter(
      (t) =>
        t.id !== txn.id &&
        t.categorySource !== "user" &&
        matchRule(t, [...competing, rule])?.id === rule.id,
    )
    .map((t) => t.id);
  return { similarIds, count: similarIds.length };
}
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
    delete txn.ruleId;
    if (!createRule)
      return { transaction: txn, rule: null, similarIds: [], appliedCount: 0 };
    const candidate = proposedRule(txn, category);
    let rule = db.rules.find(
      (r) =>
        r.pattern === candidate.pattern &&
        r.matchType === candidate.matchType &&
        r.direction === candidate.direction,
    );
    if (rule)
      Object.assign(rule, {
        category,
        createdAt: candidate.createdAt,
        exampleTransactionId: txn.id,
      });
    else {
      rule = candidate;
      db.rules.push(rule);
    }
    txn.ruleId = rule.id;
    const similar = db.transactions.filter(
      (t) =>
        t.id !== txn.id &&
        t.categorySource !== "user" &&
        matchRule(t, db.rules)?.id === rule!.id,
    );
    let appliedCount = 0;
    if (applyToSimilar)
      for (const t of similar) {
        if (t.category !== category) appliedCount++;
        Object.assign(t, {
          category,
          categorySource: "user_rule",
          confidence: 1,
          ruleId: rule.id,
        });
      }
    return {
      transaction: txn,
      rule,
      similarIds: similar.map((t) => t.id),
      appliedCount,
    };
  });
}
