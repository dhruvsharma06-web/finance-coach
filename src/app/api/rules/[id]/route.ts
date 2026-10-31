import { updateDb } from "@/lib/db";
import { handle, ok } from "@/lib/api";

/** DELETE /api/rules/:id → { ok: true }  (past transactions keep their category) */
export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  await updateDb((db) => {
    db.rules = db.rules.filter((r) => r.id !== id);
  });
  return ok({ ok: true });
});
