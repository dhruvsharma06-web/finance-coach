import { NextRequest, NextResponse } from "next/server";
import { authRequired, validSession, SESSION_COOKIE } from "./lib/auth";
export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (
    path === "/login" ||
    path.startsWith("/api/auth/") ||
    path.startsWith("/_next/") ||
    (!path.startsWith("/api/") &&
      /\.(?:svg|ico|png|jpe?g|webp|gif|woff2?|ttf|css|js|map|csv|pdf|txt)$/i.test(
        path,
      ))
  )
    return NextResponse.next();
  if (!authRequired() || validSession(req.cookies.get(SESSION_COOKIE)?.value))
    return NextResponse.next();
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
