import { z } from "zod";
import { readDb } from "@/lib/db";
import { fixPlan } from "@/lib/simulate/solve";
import { handle, ok, fail } from "@/lib/api";
export const maxDuration = 60;
export const POST = handle(async (req: Request) => {
  const body = z
    .object({ goalId: z.string().min(1).optional() })
    .safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Send { goalId?: string }.");
  const db = await readDb();
  if (
    body.data.goalId &&
    !db.profile.goals.some((g) => g.id === body.data.goalId)
  )
    return fail("Goal not found", 404);
  return ok(
    await fixPlan(db.profile, db.transactions, db.recurring, body.data.goalId),
  );
});
