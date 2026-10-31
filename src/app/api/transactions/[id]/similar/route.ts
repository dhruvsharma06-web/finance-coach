import { similarPreview } from "@/lib/categorize/learn";
import { CATEGORY_IDS } from "@/lib/categories";
import { readDb } from "@/lib/db";
import { fail, handle, ok } from "@/lib/api";
export const GET = handle(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params,
      category = new URL(req.url).searchParams.get("category");
    if (category && !CATEGORY_IDS.some((c) => c === category))
      return fail("Unknown category");
    if (!(await readDb()).transactions.some((t) => t.id === id))
      return fail("Transaction not found", 404);
    return ok(await similarPreview(id));
  },
);
