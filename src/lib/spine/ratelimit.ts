// ratelimit.ts — a small fixed-window rate limiter. Defends account creation and tool invocation
// from abuse (agents hammer endpoints; bots probe signups). In-memory per process; for multi-
// instance deploys, back it with Redis behind the same interface.

interface Window { count: number; resetAt: number; }
const windows = new Map<string, Window>();

export interface RateResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
}

export function rateLimit(key: string, max: number, windowMs: number): RateResult {
  const now = Date.now();
  const w = windows.get(key);
  if (!w || w.resetAt <= now) {
    const resetAt = now + windowMs;
    windows.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: max - 1, resetAt, retryAfterSec: 0 };
  }
  if (w.count >= max) {
    return { allowed: false, remaining: 0, resetAt: w.resetAt, retryAfterSec: Math.ceil((w.resetAt - now) / 1000) };
  }
  w.count++;
  return { allowed: true, remaining: max - w.count, resetAt: w.resetAt, retryAfterSec: 0 };
}

/** Best-effort client IP from common proxy headers. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// Occasionally evict expired windows so the map doesn't grow unbounded.
let lastSweep = 0;
export function maybeSweep(): void {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
}
