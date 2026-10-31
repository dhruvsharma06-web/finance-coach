import { z } from "zod";
import { parseQuickAdd } from "@/lib/ingest/quick-add";
import { todayIST } from "@/lib/ingest/sms";
import { toIsoDate } from "@/lib/ingest/csv";
import { readDb } from "@/lib/db";
import { ingest } from "@/lib/ingest";
import { CATEGORY_IDS } from "@/lib/categories";
import { fail, handle, ok } from "@/lib/api";
export const GET = handle(async (req: Request) => {
  const p = new URL(req.url).searchParams,
    month = p.get("month"),
    category = p.get("category"),
    q = p.get("q")?.toLowerCase();
  if (month && !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month))
    return fail("Use month YYYY-MM.");
  if (category && !CATEGORY_IDS.some((c) => c === category))
    return fail("Unknown category");
  const db = await readDb();
  return ok(
    db.transactions
      .filter(
        (t) =>
          (!month || t.date.startsWith(month)) &&
          (!category || t.category === category) &&
          (!q ||
            (t.merchant + " " + t.description).toLowerCase().includes(q)) &&
          (p.get("needsReview") !== "true" || t.confidence < 0.6),
      )
      .reverse(),
  );
});
const source = z.enum(["manual", "voice"]).optional();
const textBody = z.object({ text: z.string().trim().min(1).max(2000), source });
const structuredBody = z.object({
  date: z
    .string()
    .refine((s) => !!toIsoDate(s), "Invalid date")
    .transform(toIsoDate)
    .optional(),
  description: z.string().trim().min(1).max(2000),
  merchant: z.string().trim().max(200).optional(),
  amount: z
    .union([
      z.number(),
      z
        .string()
        .trim()
        .regex(/^\d+(?:\.\d{1,2})?$/),
    ])
    .transform(Number)
    .pipe(z.number().positive().finite()),
  direction: z.enum(["debit", "credit"]).default("debit"),
  source,
});
export const POST = handle(async (req: Request) => {
  const raw: unknown = await req.json().catch(() => null);
  if (raw && typeof raw === "object" && "text" in raw) {
    const parsed = textBody.safeParse(raw);
    if (!parsed.success)
      return fail(
        "Provide non-empty transaction text and source manual or voice.",
      );
    const row = await parseQuickAdd(parsed.data.text);
    if (!row)
      return fail(
        "Enter one completed payment, for example: spent 450 on Swiggy yesterday.",
      );
    return ok(await ingest([row], parsed.data.source ?? "manual"));
  }
  const parsed = structuredBody.safeParse(raw);
  if (!parsed.success)
    return fail(
      "Provide a valid date, description, positive amount, and debit or credit direction.",
    );
  const { source: inputSource, ...row } = parsed.data;
  return ok(
    await ingest(
      [{ ...row, date: row.date ?? todayIST() }],
      inputSource ?? "manual",
    ),
  );
});
