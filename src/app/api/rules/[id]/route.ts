import { updateDb } from "@/lib/db";
import { handle, ok } from "@/lib/api";

/** DELETE /api/rules/:id → { ok: true }  (past transactions keep their category) */
export const DELETE = handle(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    await updateDb((db) => {
      db.rules = db.rules.filter((r) => r.id !== id);
    });
    return ok({ ok: true });
  },
);
import { CATEGORY_IDS } from "@/lib/categories";
import { fail } from "@/lib/api";
export const PATCH = handle(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params,
      body = await req.json().catch(() => null);
    if (!CATEGORY_IDS.includes(body?.category)) return fail("Unknown category");
    const rule = await updateDb((db) => {
      const r = db.rules.find((r) => r.id === id);
      if (r) {
        r.category = body.category;
        r.createdAt = new Date().toISOString();
      }
      return r;
    });
    return rule ? ok(rule) : fail("Rule not found", 404);
  },
);
