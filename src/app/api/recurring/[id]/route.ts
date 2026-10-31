import { z } from "zod";
import { updateDb } from "@/lib/db";
import { fail, handle, ok } from "@/lib/api";
const schema = z
  .object({
    userConfirmedInUse: z.boolean().optional(),
    status: z.enum(["cancelled", "active"]).optional(),
  })
  .strict()
  .refine((b) => b.userConfirmedInUse !== undefined || b.status !== undefined);
export const PATCH = handle(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params,
      parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success)
      return fail(
        "Provide userConfirmedInUse as boolean, or status as active/cancelled.",
      );
    const body = parsed.data;
    const updated = await updateDb((db) => {
      const r = db.recurring.find((r) => r.id === id);
      if (!r) return null;
      if (typeof body.userConfirmedInUse === "boolean") {
        r.userConfirmedInUse = body.userConfirmedInUse;
        if (r.status !== "cancelled" && r.status !== "price_changed")
          r.status = body.userConfirmedInUse ? "active" : "possibly_unused";
      }
      if (body.status) r.status = body.status;
      for (const n of db.nudges)
        if (n.relatedRecurringId === id) n.dismissed = true;
      return r;
    });
    return updated ? ok(updated) : fail("Recurring payment not found", 404);
  },
);
