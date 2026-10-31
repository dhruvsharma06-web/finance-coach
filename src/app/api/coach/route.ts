import { coachReply } from "@/lib/coach";
import { fail, handle, ok } from "@/lib/api";
import type { CoachMessage } from "@/lib/types";

export const maxDuration = 60;

/** POST /api/coach  { messages: CoachMessage[] } → CoachMessage (the assistant reply) */
export const POST = handle(async (req: Request) => {
  const { messages } = (await req.json()) as { messages: CoachMessage[] };
  if (!messages?.length) return fail("messages required");
  return ok(await coachReply(messages));
});
