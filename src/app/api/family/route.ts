import { z } from "zod";
import { readDb, updateDb } from "@/lib/db";
import { familySummary } from "@/lib/family";
import { seedFamily } from "@/lib/seed-round4";
import { fail, handle, ok } from "@/lib/api";

/** GET /api/family → { family, summary } */
export const GET = handle(async () => {
  const family = (await readDb()).family ?? seedFamily();
  return ok({ family, summary: familySummary(family) });
});

const member = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40),
  relation: z.string().min(1).max(30),
  role: z.enum(["earner", "dependent", "student", "retired"]),
  monthlyIncome: z.number().min(0).max(1e8),
  city: z.string().max(40).optional(),
  shareDetails: z.boolean(),
});
const schema = z.object({
  name: z.string().min(1).max(60),
  members: z.array(member).min(1).max(20),
  support: z.array(z.object({ fromMemberId: z.string(), toMemberId: z.string(), amount: z.number().min(0).max(1e7), day: z.number().int().min(1).max(31), label: z.string().max(60).optional() })).max(40),
  goals: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(60),
        targetAmount: z.number().positive().max(1e9),
        targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        saved: z.record(z.string(), z.number().min(0)),
        monthly: z.record(z.string(), z.number().min(0)),
      }),
    )
    .max(20),
});

/** PUT /api/family  Family → { family, summary } (replaces the whole household) */
export const PUT = handle(async (req: Request) => {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("That family data doesn't look right.");
  const family = await updateDb((db) => (db.family = parsed.data));
  return ok({ family, summary: familySummary(family) });
});
