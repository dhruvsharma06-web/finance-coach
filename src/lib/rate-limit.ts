/** Per-process sliding windows. A shared deployment store is needed for global multi-instance limits. */
const windows = new Map<string, number[]>();
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim().slice(0, 128) ||
    "local"
  );
}
export function checkLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { allowed: boolean; retryAfter: number } {
  let hits = (windows.get(key) ?? []).filter((t) => t > now - windowMs);
  if (hits.length >= limit) {
    windows.set(key, hits);
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)),
    };
  }
  hits.push(now);
  windows.set(key, hits);
  if (windows.size > 10000)
    for (const [k, v] of windows)
      if (!v.length || v[v.length - 1] <= now - 600000) windows.delete(k);
  return { allowed: true, retryAfter: 0 };
}
export function rateLimitedResponse(retryAfter: number): Response {
  return Response.json(
    { error: "Too many requests, try again in a moment." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "Cache-Control": "no-store",
      },
    },
  );
}
export function limitRequest(req: Request, path: string): Response | null {
  const limits: Record<string, number> = {
    "/api/coach": 20,
    "/api/simulate": 40,
    "/api/plan/fix": 20,
    "/api/import": 10,
    "/api/import/preview": 10,
    "/api/profile/life-event": 20,
  };
  const limit = limits[path];
  if (!limit || req.method !== "POST") return null;
  const result = checkLimit(path + ":" + clientIp(req), limit, 60000);
  return result.allowed ? null : rateLimitedResponse(result.retryAfter);
}
