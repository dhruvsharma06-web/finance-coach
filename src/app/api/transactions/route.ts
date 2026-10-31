import { readDb } from "@/lib/db";
import { ingest } from "@/lib/ingest";
import { fail, handle, ok } from "@/lib/api";


/**
 * GET /api/transactions?month=YYYY-MM&category=dining&q=swiggy → Transaction[] (newest first)
 */
export const GET = handle(async (req: Request) => {
  const p = new URL(req.url).searchParams;
  const month = p.get("month");
  const category = p.get("category");
  const q = p.get("q")?.toLowerCase();
  const db = await readDb();
  const list = db.transactions
    .filter((t) => !month || t.date.startsWith(month))
    .filter((t) => !category || t.category === category)
    .filter((t) => !q || `${t.merchant} ${t.description}`.toLowerCase().includes(q))
    .reverse();
  return ok(list);
});

/**
 * POST /api/transactions  { date, description, merchant?, amount, direction }
 * Manual / voice-logged transaction. Goes through the same ingest pipeline.
 * (Lane B may add { text: "spent 450 on swiggy" } natural-language parsing.)
 */
export const POST = handle(async (req: Request) => {
  const body = await req.json();
  if (!body?.amount || !body?.description) return fail("amount and description are required");
  const result = await ingest(
    [
      {
        date: body.date ?? new Date().toISOString().slice(0, 10),
        description: body.description,
        merchant: body.merchant,
        amount: Math.abs(Number(body.amount)),
        direction: body.direction ?? "debit",
      },
    ],
    body.source === "voice" ? "voice" : "manual",
  );
  return ok(result);
});
