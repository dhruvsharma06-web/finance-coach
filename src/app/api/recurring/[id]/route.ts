import { updateDb } from "@/lib/db";
import { fail, handle, ok } from "@/lib/api";

/**
 * PATCH /api/recurring/:id  { userConfirmedInUse?: boolean, status?: "cancelled" | "active" }
 * → RecurringPayment. Answering "still using it?" clears the possibly_unused flag.
 */
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const updated = await updateDb((db) => {
    const r = db.recurring.find((x) => x.id === id);
    if (!r) return null;
    if (typeof body.userConfirmedInUse === "boolean") {
      r.userConfirmedInUse = body.userConfirmedInUse;
      if (body.userConfirmedInUse && r.status === "possibly_unused") r.status = "active";
    }
    if (body.status === "cancelled" || body.status === "active") r.status = body.status;
    db.nudges.forEach((n) => {
      if (n.relatedRecurringId === id) n.dismissed = true;
    });
    return r;
  });
  return updated ? ok(updated) : fail("Not found", 404);
});
