import { z } from "zod";
import { newId, updateDb } from "@/lib/db";
import { resolveShares } from "@/lib/splits";
import { seedSplits } from "@/lib/seed-round4";
import { fail, handle, ok } from "@/lib/api";

const schema = z.object({
  groupId: z.string(),
  description: z.string().min(1).max(80),
  amount: z.number().positive().max(1e7),
  paidBy: z.string(),
  mode: z.enum(["equal", "exact", "percent"]),
  /** members included in the split */
  memberIds: z.array(z.string()).min(1),
  /** ₹ (exact) or % (percent) per member */
  values: z.record(z.string(), z.number().min(0)).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** POST /api/splits/expenses → SplitExpense */
export const POST = handle(async (req: Request) => {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Add a description, an amount and who paid.");
  const b = parsed.data;
  let shares: Record<string, number>;
  try {
    shares = resolveShares(b.amount, b.memberIds, b.mode, b.values);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Shares don't add up");
  }
  const expense = await updateDb((db) => {
    db.splits ??= seedSplits();
    const group = db.splits.groups.find((g) => g.id === b.groupId);
    if (!group || !group.members.some((m) => m.id === b.paidBy)) return null;
    const e = { id: newId(), groupId: b.groupId, description: b.description, amount: b.amount, paidBy: b.paidBy, mode: b.mode, shares, date: b.date ?? new Date().toISOString().slice(0, 10) };
    db.splits.expenses.push(e);
    return e;
  });
  return expense ? ok(expense) : fail("Group or payer not found", 404);
});
