import { readDb } from "@/lib/db";
import { handle, ok } from "@/lib/api";


/** GET /api/rules → CategoryRule[] (newest first) */
export const GET = handle(async () => ok([...(await readDb()).rules].reverse()));
