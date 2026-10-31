import { z } from "zod";
import { readDb, updateDb, nowIso } from "@/lib/db";
import { handle, ok, fail } from "@/lib/api";
import { CATEGORY_IDS } from "@/lib/categories";
import { toIsoDate } from "@/lib/ingest/csv";
const money = z.number().finite().nonnegative().max(1e9),
  day = z.string().refine((s) => !!toIsoDate(s));
const patchSchema = z
  .object({
    name: z.string().max(100).optional(),
    monthlyIncome: money.optional(),
    currency: z.literal("INR").optional(),
    incomeDay: z.number().int().min(1).max(31).optional(),
    fixedCosts: z
      .array(
        z.object({
          id: z.string(),
          label: z.string().min(1).max(100),
          amount: money,
          category: z.enum(CATEGORY_IDS),
        }),
      )
      .max(100)
      .optional(),
    emergencyFund: z
      .object({ current: money, targetMonths: z.number().min(0).max(60) })
      .optional(),
    categoryBudgets: z.partialRecord(z.enum(CATEGORY_IDS), money).optional(),
    goals: z
      .array(
        z.object({
          id: z.string(),
          name: z.string().min(1).max(120),
          targetAmount: money,
          currentAmount: money,
          targetDate: day,
          priority: z.enum(["high", "medium", "low"]),
          icon: z.string().optional(),
        }),
      )
      .max(100)
      .optional(),
    lifeEvents: z
      .array(
        z.object({
          id: z.string(),
          date: day,
          description: z.string().max(2000),
        }),
      )
      .max(1000)
      .optional(),
    updatedAt: z.string().optional(),
  })
  .strict();
export const GET = handle(async () => ok((await readDb()).profile));
export const PUT = handle(async (req: Request) => {
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return fail(
      "Provide valid profile fields, non-negative amounts and valid dates.",
    );
  return ok(
    await updateDb((db) => {
      db.profile = {
        ...db.profile,
        ...parsed.data,
        currency: "INR",
        updatedAt: nowIso(),
      };
      return db.profile;
    }),
  );
});
