import { cookies } from "next/headers";
import { handle, ok } from "@/lib/api";
import { authRequired, validSession, SESSION_COOKIE } from "@/lib/auth";
export const GET = handle(async () => {
  const required = authRequired();
  return ok(
    {
      authenticated:
        validSession((await cookies()).get(SESSION_COOKIE)?.value),
      required,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});
