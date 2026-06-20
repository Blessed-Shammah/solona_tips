// ratelimit.ts — fixed-window rate limiting for account creation and tool invocation.
// Local/dev uses an in-memory map. Multi-instance deploys can set REDIS_URL to share counters.
import { createConnection, type Socket } from "node:net";
import { connect as connectTls, type TLSSocket } from "node:tls";

interface Window { count: number; resetAt: number; }
const windows = new Map<string, Window>();

export interface RateResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
}

export async function rateLimit(key: string, max: number, windowMs: number): Promise<RateResult> {
  if (process.env.REDIS_URL) {
    try {
      return await redisRateLimit(key, max, windowMs);
    } catch (e) {
      console.warn(`[ratelimit] Redis unavailable, falling back to local memory: ${(e as Error).message}`);
    }
  }
  return memoryRateLimit(key, max, windowMs);
}

function memoryRateLimit(key: string, max: number, windowMs: number): RateResult {
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

async function redisRateLimit(key: string, max: number, windowMs: number): Promise<RateResult> {
  const now = Date.now();
  const redisKey = `soltip:rl:${key}`;
  const conn = await RedisConnection.open(process.env.REDIS_URL!);
  try {
    const count = Number(await conn.command(["INCR", redisKey]));
    let ttl = 0;
    if (count === 1) {
      await conn.command(["PEXPIRE", redisKey, String(windowMs)]);
      ttl = windowMs;
    } else {
      ttl = Number(await conn.command(["PTTL", redisKey]));
      if (ttl < 0) {
        await conn.command(["PEXPIRE", redisKey, String(windowMs)]);
        ttl = windowMs;
      }
    }
    const allowed = count <= max;
    return {
      allowed,
      remaining: Math.max(0, max - count),
      resetAt: now + ttl,
      retryAfterSec: allowed ? 0 : Math.ceil(ttl / 1000),
    };
  } finally {
    conn.close();
  }
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

type RedisSocket = Socket | TLSSocket;
type RespValue = string | number | null;

class RedisConnection {
  private buffer = Buffer.alloc(0);
  private waiters: Array<() => void> = [];

  private constructor(private readonly socket: RedisSocket) {
    socket.on("data", (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      const waiters = this.waiters.splice(0);
      waiters.forEach((resolve) => resolve());
    });
  }

  static async open(rawUrl: string): Promise<RedisConnection> {
    const url = new URL(rawUrl);
    const isTls = url.protocol === "rediss:";
    const port = Number(url.port || (isTls ? 6380 : 6379));
    const socket = isTls
      ? connectTls({ host: url.hostname, port, servername: url.hostname })
      : createConnection({ host: url.hostname, port });
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("error", reject);
    });
    const conn = new RedisConnection(socket);
    const username = decodeURIComponent(url.username || "");
    const password = decodeURIComponent(url.password || "");
    if (password) {
      await conn.command(username ? ["AUTH", username, password] : ["AUTH", password]);
    }
    const db = url.pathname.replace("/", "");
    if (db) await conn.command(["SELECT", db]);
    return conn;
  }

  close(): void {
    this.socket.end();
  }

  async command(parts: string[]): Promise<RespValue> {
    this.socket.write(encodeRespCommand(parts));
    return this.readValue();
  }

  private async readValue(): Promise<RespValue> {
    const line = await this.readLine();
    const prefix = line[0];
    const value = line.slice(1);
    if (prefix === "+") return value;
    if (prefix === ":") return Number(value);
    if (prefix === "-") throw new Error(value);
    if (prefix === "$") {
      const length = Number(value);
      if (length < 0) return null;
      const bytes = await this.readBytes(length + 2);
      return bytes.subarray(0, length).toString("utf8");
    }
    throw new Error(`Unsupported Redis response: ${line}`);
  }

  private async readLine(): Promise<string> {
    for (;;) {
      const idx = this.buffer.indexOf("\r\n");
      if (idx >= 0) {
        const line = this.buffer.subarray(0, idx).toString("utf8");
        this.buffer = this.buffer.subarray(idx + 2);
        return line;
      }
      await this.waitForData();
    }
  }

  private async readBytes(length: number): Promise<Buffer> {
    while (this.buffer.length < length) await this.waitForData();
    const bytes = this.buffer.subarray(0, length);
    this.buffer = this.buffer.subarray(length);
    return bytes;
  }

  private async waitForData(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const onError = (e: Error) => {
        this.socket.off("close", onClose);
        reject(e);
      };
      const onClose = () => {
        this.socket.off("error", onError);
        reject(new Error("Redis connection closed"));
      };
      this.waiters.push(() => {
        this.socket.off("error", onError);
        this.socket.off("close", onClose);
        resolve();
      });
      this.socket.once("error", onError);
      this.socket.once("close", onClose);
    });
  }
}

function encodeRespCommand(parts: string[]): string {
  let out = `*${parts.length}\r\n`;
  for (const part of parts) {
    out += `$${Buffer.byteLength(part)}\r\n${part}\r\n`;
  }
  return out;
}
