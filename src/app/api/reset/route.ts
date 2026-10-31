import { resetDb } from "@/lib/db";
import { handle, ok } from "@/lib/api";

/** POST /api/reset → restores demo seed data (used by the "Reset demo" button) */
export const POST = handle(async () => {
  await resetDb();
  return ok({ ok: true });
});
