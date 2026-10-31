import { handle, ok } from "@/lib/api";
import { aiAvailable } from "@/lib/ai";
import { authRequired } from "@/lib/auth";
import { version } from "../../../../package.json";
export const GET = handle(async () =>
  ok(
    {
      ok: true,
      version,
      aiProvider: (process.env.AI_PROVIDER ?? "google").toLowerCase(),
      aiAvailable: aiAvailable(),
      passcodeRequired: authRequired(),
    },
    { headers: { "Cache-Control": "no-store" } },
  ),
);
