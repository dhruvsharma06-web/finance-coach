import { z } from "zod";
import { newId, updateDb } from "@/lib/db";
import { seedSplits } from "@/lib/seed-round4";
import { fail, handle, ok } from "@/lib/api";

const schema = z.object({ groupId: z.string(), from: z.string(), to: z.string(), amount: z.number().positive().max(1e7) });

/** POST /api/splits/settle { groupId, from, to, amount } → Settlement (records a payment; never moves money) */
export const POST = handle(async (req: Request) => {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.from === parsed.data.to) return fail("Pick who paid whom and how much.");
  const s = await updateDb((db) => {
    db.splits ??= seedSplits();
    const settlement = { id: newId(), ...parsed.data, date: new Date().toISOString().slice(0, 10) };
    db.splits.settlements.push(settlement);
    return settlement;
  });
  return ok(s);
});
