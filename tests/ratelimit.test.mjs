// Fixed-window rate limiter behavior (mirrors src/lib/spine/ratelimit.ts).
import { test } from "node:test";
import assert from "node:assert/strict";

function makeLimiter() {
  const windows = new Map();
  return function rateLimit(key, max, windowMs, now) {
    const w = windows.get(key);
    if (!w || w.resetAt <= now) {
      windows.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: max - 1 };
    }
    if (w.count >= max) return { allowed: false, remaining: 0 };
    w.count++;
    return { allowed: true, remaining: max - w.count };
  };
}

test("rate limit — allows up to max, then blocks within the window", () => {
  const rl = makeLimiter();
  let t = 1000;
  assert.equal(rl("k", 3, 1000, t).allowed, true);
  assert.equal(rl("k", 3, 1000, t).allowed, true);
  assert.equal(rl("k", 3, 1000, t).allowed, true);
  assert.equal(rl("k", 3, 1000, t).allowed, false); // 4th in window blocked
});

test("rate limit — resets after the window elapses", () => {
  const rl = makeLimiter();
  assert.equal(rl("k", 1, 1000, 1000).allowed, true);
  assert.equal(rl("k", 1, 1000, 1500).allowed, false); // same window
  assert.equal(rl("k", 1, 1000, 2001).allowed, true);  // new window
});

test("rate limit — keys are isolated", () => {
  const rl = makeLimiter();
  assert.equal(rl("a", 1, 1000, 1000).allowed, true);
  assert.equal(rl("a", 1, 1000, 1000).allowed, false);
  assert.equal(rl("b", 1, 1000, 1000).allowed, true); // different key unaffected
});
