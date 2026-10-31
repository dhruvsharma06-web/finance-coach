import { readDb } from "@/lib/db";
import { buildDashboard } from "@/lib/dashboard";
import { generateNudges } from "@/lib/insights/nudges";
import { handle, ok } from "@/lib/api";

/** GET /api/dashboard?month=YYYY-MM → DashboardSummary (refreshes nudges first so the Overview is never stale) */
export const GET = handle(async (req: Request) => {
  const month = new URL(req.url).searchParams.get("month") ?? undefined;
  await generateNudges().catch(() => []);
  return ok(buildDashboard(await readDb(), month));
});
