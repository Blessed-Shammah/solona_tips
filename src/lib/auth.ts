// auth.ts — protect merchant-only actions (creating links, running reconciliation).
// If ADMIN_SECRET is unset, these actions are open (fine for local dev; SET IT for any public deploy).
import { config } from "./config";

// Merchant-grade guard (create links, reconcile). Open when no secret is set — convenient for local
// dev of those non-sensitive flows. For anything exposing data, use `isAdmin` instead.
export function isAuthorized(req: Request): boolean {
  if (!config.adminSecret) return true; // no secret configured → open (dev only)
  return matchesSecret(req);
}

// Admin-grade guard — FAILS CLOSED. If ADMIN_SECRET isn't configured, NOBODY gets in (so a deploy
// that forgot to set it can't leak data). Use for anything exposing accounts, PII, or money ops.
export function isAdmin(req: Request): boolean {
  if (!config.adminSecret) return false; // not configured → locked
  return matchesSecret(req);
}

/** True if ADMIN_SECRET is configured (so the UI can show "configure me" vs "enter secret"). */
export function adminConfigured(): boolean {
  return !!config.adminSecret;
}

function matchesSecret(req: Request): boolean {
  const header = req.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const xkey = req.headers.get("x-admin-secret") || "";
  return safeEqual(bearer, config.adminSecret) || safeEqual(xkey, config.adminSecret);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
