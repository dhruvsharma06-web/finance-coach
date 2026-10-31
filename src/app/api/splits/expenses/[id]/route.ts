import { updateDb } from "@/lib/db";
import { handle, ok } from "@/lib/api";

/** DELETE /api/splits/expenses/:id → { ok: true } */
export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  await updateDb((db) => {
    if (db.splits) db.splits.expenses = db.splits.expenses.filter((e) => e.id !== id);
  });
  return ok({ ok: true });
});
