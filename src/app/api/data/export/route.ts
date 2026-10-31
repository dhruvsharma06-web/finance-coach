import { handle } from "@/lib/api";
import { readDb } from "@/lib/db";
import { protectTransaction } from "@/lib/ingest/privacy";
export const GET = handle(async () => {
  const db = await readDb();
  db.transactions = db.transactions.map(protectTransaction);
  return Response.json(db, {
    headers: {
      "Content-Disposition": 'attachment; filename="kosh-export.json"',
      "Cache-Control": "no-store",
    },
  });
});
