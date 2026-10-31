import { readDb } from "@/lib/db";
import { buildWrapped } from "@/lib/wrapped";
import { latestDataMonth } from "@/lib/simulate/baseline";
import { fail, handle, ok } from "@/lib/api";

/** GET /api/wrapped?month=YYYY-MM → Wrapped (defaults to the latest month with data) */
export const GET = handle(async (req: Request) => {
  const db = await readDb();
  const month = new URL(req.url).searchParams.get("month") ?? latestDataMonth(db.transactions);
  if (!/^\d{4}-\d{2}$/.test(month)) return fail("month must be YYYY-MM");
  return ok(buildWrapped(db, month));
});
