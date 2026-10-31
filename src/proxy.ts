import { NextRequest, NextResponse } from "next/server";
import {
  authRequired,
  validSession,
  SESSION_COOKIE,
  refreshSession,
  sessionCookieOptions,
} from "./lib/auth";
export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (
    path === "/" ||
    path === "/login" ||
    path === "/api/health" ||
    path.startsWith("/api/auth/") ||
    path.startsWith("/_next/") ||
    (!path.startsWith("/api/") &&
      /\.(?:svg|ico|png|jpe?g|webp|gif|woff2?|ttf|css|js|map|csv|pdf|txt)$/i.test(
        path,
      ))
  )
    return NextResponse.next();
  // Keep no-key demo APIs usable, while giving demo visitors the same entry flow.
  if (!authRequired() && (path === "/api" || path.startsWith("/api/"))) return NextResponse.next();
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (validSession(token)) {
    const response = NextResponse.next();
    response.cookies.set(
      SESSION_COOKIE,
      refreshSession(token!),
      sessionCookieOptions(),
    );
    return response;
  }
  if (path === "/api" || path.startsWith("/api/"))
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  const url = new URL("/login", req.url);
  url.searchParams.set("next", path + req.nextUrl.search);
  return NextResponse.redirect(url);
}
export const config = { matcher: "/:path*" };
