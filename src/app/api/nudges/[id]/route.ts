import { updateDb } from "@/lib/db";
import { handle, ok } from "@/lib/api";

/** PATCH /api/nudges/:id  { dismissed: true } → { ok: true } */
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { dismissed = true } = await req.json().catch(() => ({}));
  await updateDb((db) => {
    const n = db.nudges.find((x) => x.id === id);
    if (n) n.dismissed = dismissed;
  });
  return ok({ ok: true });
});
