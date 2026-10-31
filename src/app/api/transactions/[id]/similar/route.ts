import { similarPreview } from "@/lib/categorize/learn";
import { CATEGORY_IDS } from "@/lib/categories";
import { fail, handle, ok } from "@/lib/api";
import type { CategoryId } from "@/lib/types";
export const GET = handle(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const category = new URL(req.url).searchParams.get("category");
    if (category && !CATEGORY_IDS.includes(category as CategoryId))
      return fail("Unknown category");
    return ok(await similarPreview(id));
  },
);
