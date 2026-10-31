import { z } from "zod";
import { readDb, updateDb } from "@/lib/db";
import { festivalOutlook, FESTIVALS } from "@/lib/festivals";
import { fail, handle, ok } from "@/lib/api";

/** GET /api/festivals → FestivalOutlook[] (next 10) */
export const GET = handle(async () => ok(festivalOutlook(await readDb())));

/** POST /api/festivals { id, add } → FestivalOutlook[]  (puts money in that festival's pot) */
export const POST = handle(async (req: Request) => {
  const parsed = z.object({ id: z.string(), add: z.number().min(-1e7).max(1e7) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !FESTIVALS.some((f) => f.id === parsed.data.id)) return fail("Unknown festival");
  await updateDb((db) => {
    db.festivalPots ??= {};
    db.festivalPots[parsed.data.id] = Math.max(0, (db.festivalPots[parsed.data.id] ?? 0) + parsed.data.add);
  });
  return ok(festivalOutlook(await readDb()));
});
