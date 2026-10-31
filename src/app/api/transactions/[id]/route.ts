import { z } from "zod";
import { applyCorrection } from "@/lib/categorize/learn";
import { CATEGORY_IDS } from "@/lib/categories";
import { readDb } from "@/lib/db";
import { fail, handle, ok } from "@/lib/api";
const schema = z.object({
  category: z.enum(CATEGORY_IDS),
  createRule: z.boolean().optional(),
  applyToSimilar: z.boolean().optional(),
});
export const PATCH = handle(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params,
      body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success)
      return fail("Provide a valid category and boolean correction options.");
    if (!(await readDb()).transactions.some((t) => t.id === id))
      return fail("Transaction not found", 404);
    const { category, ...opts } = body.data;
    return ok(await applyCorrection(id, category, opts));
  },
);
