/**
 * Fixed-window in-memory limiter. Good enough for a single instance;
 * replace with a Postgres/Redis-backed limiter when running multiple instances.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  if (b.count >= max) return { ok: false, retryAfterMs: b.resetAt - now };
  b.count++;
  return { ok: true, retryAfterMs: 0 };
}
