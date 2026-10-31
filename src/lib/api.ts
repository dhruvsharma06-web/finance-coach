import { NextResponse, connection } from "next/server";
import { limitRequest } from "./rate-limit";

/** Shared helpers for route handlers. */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wrap a handler so thrown errors become JSON 500s instead of HTML pages. */
export function handle<A extends unknown[]>(
  fn: (...args: A) => Promise<Response>,
) {
  return async (...args: A) => {
    await connection(); // opt out of prerendering (cacheComponents); must stay outside try/catch
    try {
      if (args[0] instanceof Request) {
        const request = args[0];
        if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
          const origin = request.headers.get("origin");
          const expectedOrigin = new URL(request.url);
          const requestHost = request.headers.get("host");
          if(requestHost)expectedOrigin.host=requestHost;
          const forwardedProto=request.headers.get("x-forwarded-proto");
          if(forwardedProto==="http"||forwardedProto==="https")expectedOrigin.protocol=forwardedProto+":";
          if (
            (origin && origin !== expectedOrigin.origin) ||
            (!origin && request.headers.get("sec-fetch-site") === "cross-site")
          )
            return fail("Request origin not allowed.", 403);
          if (Number(request.headers.get("content-length")) > 6 * 1024 * 1024)
            return fail("Request too large.", 413);
          if (
            request.headers.get("content-type")?.includes("application/json")
          ) {
            const text = await request.clone().text();
            if (text.length > 1024 * 1024)
              return fail("Request too large.", 413);
            if (text.trim()) {
              try {
                const value = JSON.parse(text);
                if (!value || typeof value !== "object" || Array.isArray(value))
                  return fail("Send a JSON object.");
              } catch {
                return fail("Malformed JSON body.");
              }
            }
          }
        }
        const blocked = limitRequest(args[0], new URL(args[0].url).pathname);
        if (blocked) return blocked;
      }
      return await fn(...args);
    } catch (e) {
      if (e instanceof SyntaxError) return fail("Malformed JSON body.");
      console.error("Request failed", e instanceof Error ? e.name : "Error");
      return fail("Something went wrong. Please try again.", 500);
    }
  };
}
