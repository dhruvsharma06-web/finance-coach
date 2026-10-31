import { applyCorrection } from "@/lib/categorize/learn";
import { CATEGORY_IDS } from "@/lib/categories";
import { fail, handle, ok } from "@/lib/api";
import type { CategoryId } from "@/lib/types";

/**
 * PATCH /api/transactions/:id  { category, createRule?: boolean, applyToSimilar?: boolean }
 * → CorrectionResult. This is the correction loop.
 */
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const body = await req.json();
  if (!CATEGORY_IDS.includes(body?.category)) return fail("Unknown category");
  return ok(
    await applyCorrection(id, body.category as CategoryId, {
      createRule: body.createRule,
      applyToSimilar: body.applyToSimilar,
    }),
  );
});
