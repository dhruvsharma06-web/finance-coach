import { createHash, createHmac, timingSafeEqual } from "node:crypto";
export const SESSION_COOKIE = "kosh_session";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export function authRequired(): boolean {
  return Boolean(process.env.KOSH_PASSCODE);
}
function secret(): Buffer {
  return process.env.KOSH_SECRET
    ? Buffer.from(process.env.KOSH_SECRET)
    : createHash("sha256")
        .update(process.env.KOSH_PASSCODE ?? "")
        .digest();
}
export function checkPasscode(value: string): boolean {
  const expected = process.env.KOSH_PASSCODE;
  if (!expected) return true;
  return timingSafeEqual(
    createHash("sha256").update(value).digest(),
    createHash("sha256").update(expected).digest(),
  );
}
export function createSession(now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(now / 1000) + SESSION_SECONDS }),
  ).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", secret()).update(payload).digest("base64url")
  );
}
export function validSession(
  token: string | undefined,
  now = Date.now(),
): boolean {
  if (!token || token.length > 1000) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  try {
    const signature = Buffer.from(parts[1], "base64url"),
      expected = createHmac("sha256", secret()).update(parts[0]).digest();
    if (signature.toString("base64url") !== parts[1]) return false;
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(signature, expected)
    )
      return false;
    const payload = JSON.parse(
      Buffer.from(parts[0], "base64url").toString("utf8"),
    ) as { exp?: unknown };
    return (
      typeof payload.exp === "number" &&
      Number.isInteger(payload.exp) &&
      payload.exp > Math.floor(now / 1000) &&
      payload.exp <= Math.floor(now / 1000) + SESSION_SECONDS
    );
  } catch {
    return false;
  }
}
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  };
}
