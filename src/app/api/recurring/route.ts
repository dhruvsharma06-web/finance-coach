import { detectRecurring } from "@/lib/recurring";
import { handle, ok } from "@/lib/api";

/** GET /api/recurring → RecurringPayment[] */
export const GET = handle(async () => ok(await detectRecurring()));
