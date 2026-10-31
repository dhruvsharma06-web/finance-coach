import { readDb } from "@/lib/db";
import { buildDashboard } from "@/lib/dashboard";
import { handle, ok } from "@/lib/api";


/** GET /api/dashboard?month=YYYY-MM → DashboardSummary */
export const GET = handle(async (req: Request) => {
  const month = new URL(req.url).searchParams.get("month") ?? undefined;
  return ok(buildDashboard(await readDb(), month));
});
