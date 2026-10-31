import { readDb } from "@/lib/db";
import { buildMonthlyReport } from "@/lib/insights/report";
import { handle, ok } from "@/lib/api";

export const maxDuration = 60;

/** GET /api/report?month=YYYY-MM → MonthlyReport (defaults to latest month with data) */
export const GET = handle(async (req: Request) => {
  const month =
    new URL(req.url).searchParams.get("month") ?? (await readDb()).transactions.at(-1)?.date.slice(0, 7) ?? "2026-10";
  return ok(await buildMonthlyReport(month));
});
