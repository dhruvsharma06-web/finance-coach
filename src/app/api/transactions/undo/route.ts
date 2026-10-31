import { z } from "zod";
import { handle, ok, fail } from "@/lib/api";
import { updateDb } from "@/lib/db";
import { CATEGORY_IDS } from "@/lib/categories";
const saved = z.object({
  id: z.string(),
  category: z.enum(CATEGORY_IDS),
  categorySource: z.enum(["user_rule", "builtin", "ai", "user", "default"]),
  confidence: z.number().min(0).max(1),
  ruleId: z.string().optional(),
});
const rule = z.object({
  id: z.string(),
  pattern: z.string().max(1000),
  matchType: z.enum(["merchant_exact", "contains", "regex"]),
  category: z.enum(CATEGORY_IDS),
  direction: z.enum(["debit", "credit"]).optional(),
  createdFrom: z.enum(["correction", "manual"]),
  exampleTransactionId: z.string().optional(),
  createdAt: z.string(),
  hits: z.number().int().nonnegative(),
});
const schema = z.object({
  transactions: z.array(saved).min(1).max(1000),
  expectedCategory: z.enum(CATEGORY_IDS),
  removeRuleId: z.string().optional(),
  restoreRule: rule.optional(),
});
export const POST = handle(async (req: Request) => {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Invalid correction snapshot.");
  const data = body.data;
  const result = await updateDb((db) => {
    const records = data.transactions.map((t) =>
      db.transactions.find((x) => x.id === t.id),
    );
    if (records.some((t) => !t || t.category !== data.expectedCategory))
      return null;
    const existing = data.removeRuleId
      ? db.rules.find((r) => r.id === data.removeRuleId)
      : undefined;
    if (
      data.restoreRule &&
      (!existing ||
        existing.id !== data.restoreRule.id ||
        existing.pattern !== data.restoreRule.pattern ||
        existing.matchType !== data.restoreRule.matchType)
    )
      return null;
    if (data.restoreRule) Object.assign(existing!, data.restoreRule);
    else if (data.removeRuleId)
      db.rules = db.rules.filter((r) => r.id !== data.removeRuleId);
    data.transactions.forEach((snapshot, i) => {
      const target = records[i]!;
      delete target.ruleId;
      Object.assign(target, snapshot);
    });
    return { restored: records.length };
  });
  return result
    ? ok(result)
    : fail(
        "These transactions or the rule changed. Reload before undoing.",
        409,
      );
});
