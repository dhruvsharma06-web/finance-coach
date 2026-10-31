import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import {
  authRequired,
  checkPasscode,
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { clientIp, rateLimitedResponse } from "@/lib/rate-limit";
const failures = new Map<string, number[]>();
export const POST = handle(async (req: Request) => {
  if (!authRequired()) {
    const response = NextResponse.json(
      { authenticated: true, required: false },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(SESSION_COOKIE, createSession(), sessionCookieOptions());
    return response;
  }
  const ip = clientIp(req),
    now = Date.now(),
    recent = (failures.get(ip) ?? []).filter((t) => t > now - 600000);
  if (recent.length >= 5)
    return rateLimitedResponse(
      Math.max(1, Math.ceil((recent[0] + 600000 - now) / 1000)),
    );
  const body: unknown = await req.json().catch(() => null);
  const current = (failures.get(ip) ?? []).filter(
    (t) => t > Date.now() - 600000,
  );
  if (current.length >= 5)
    return rateLimitedResponse(
      Math.max(1, Math.ceil((current[0] + 600000 - Date.now()) / 1000)),
    );
  const passcode =
    body && typeof body === "object" && "passcode" in body
      ? body.passcode
      : undefined;
  if (typeof passcode !== "string" || !checkPasscode(passcode)) {
    current.push(Date.now());
    failures.set(ip, current);
    if (failures.size > 10000)
      for (const [key, hits] of failures)
        if (hits.at(-1)! <= now - 600000) failures.delete(key);
    return NextResponse.json(
      { error: "Incorrect passcode." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  failures.delete(ip);
  const response = NextResponse.json(
    { authenticated: true, required: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(SESSION_COOKIE, createSession(), sessionCookieOptions());
  return response;
});
