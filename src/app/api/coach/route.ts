import { z } from "zod";
import { coachReply } from "@/lib/coach";
import { fail, handle, ok } from "@/lib/api";
export const maxDuration = 60;
const schema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});
export const POST = handle(async (req: Request) => {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success || body.data.messages.at(-1)?.role !== "user")
    return fail("Send messages ending with a user question.");
  return ok(await coachReply(body.data.messages));
});
