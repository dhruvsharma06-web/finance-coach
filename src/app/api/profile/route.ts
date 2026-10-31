import { readDb, updateDb, nowIso } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import type { FinancialProfile } from "@/lib/types";


/** GET /api/profile → FinancialProfile */
export const GET = handle(async () => ok((await readDb()).profile));

/**
 * PUT /api/profile  Partial<FinancialProfile> → FinancialProfile
 * Shallow-merges top-level fields (send full arrays for goals / fixedCosts).
 */
export const PUT = handle(async (req: Request) => {
  const patch = (await req.json()) as Partial<FinancialProfile>;
  const profile = await updateDb((db) => {
    db.profile = { ...db.profile, ...patch, currency: "INR", updatedAt: nowIso() };
    return db.profile;
  });
  return ok(profile);
});
