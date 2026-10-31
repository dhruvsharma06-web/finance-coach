import { NextResponse, connection } from "next/server";

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
      return await fn(...args);
    } catch (e) {
      console.error(e);
      return fail(e instanceof Error ? e.message : "Something went wrong", 500);
    }
  };
}
