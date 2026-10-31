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
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    await connection(); // opt out of prerendering (cacheComponents); must stay outside try/catch
    try {
      if(args[0] instanceof Request){
        const blocked=limitRequest(args[0],new URL(args[0].url).pathname);
        if(blocked)return blocked;
      }
      return await fn(...args);
    } catch (e) {
      console.error("Request failed", e instanceof Error ? e.name : "Error");
      return fail("Something went wrong. Please try again.", 500);
    }
  };
}
