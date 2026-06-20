// session.ts — password hashing (scrypt) + session-cookie helpers for the auth routes.
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { getSessionAccount, type Account } from "./store";

export const SESSION_COOKIE = "soltip_session";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

/** Resolve the logged-in account from the session cookie, or undefined. */
export function sessionAccountFromRequest(req: Request): Account | undefined {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return undefined;
  return getSessionAccount(token);
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
