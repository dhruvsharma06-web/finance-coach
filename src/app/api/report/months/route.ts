import { reportMonths } from "@/lib/insights/report";
import { handle, ok } from "@/lib/api";

/** GET /api/report/months → ["2026-10", "2026-09", …] newest first */
export const GET = handle(async () => ok(await reportMonths()));
