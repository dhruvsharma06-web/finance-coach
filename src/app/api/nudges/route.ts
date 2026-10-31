import { readDb } from "@/lib/db";
import { generateNudges } from "@/lib/insights/nudges";
import { handle, ok } from "@/lib/api";


/** GET /api/nudges → Nudge[] (active, newest first). Regenerates first. */
export const GET = handle(async () => {
  await generateNudges();
  const db = await readDb();
  return ok(db.nudges.filter((n) => !n.dismissed).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});
