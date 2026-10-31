import { applyLifeEvent } from "@/lib/insights/life-event";
import { fail, handle, ok } from "@/lib/api";

export const maxDuration = 60;

/** POST /api/profile/life-event { description } → { profile, changes: string[] } */
export const POST = handle(async (req: Request) => {
  const { description } = await req.json().catch(() => ({}));
  if (!description?.trim()) return fail("Tell Kosh what changed");
  try {
    return ok(await applyLifeEvent(String(description)));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Couldn't apply that", 422);
  }
});
