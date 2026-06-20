// POST /api/accounts — create a developer account and issue an API key.
// GET  /api/accounts — fetch the authenticated account (balance, plan).
import { NextResponse } from "next/server";
import { createAccount, getAccountByApiKey } from "@/lib/spine/store";
import { rateLimit, clientIp, maybeSweep } from "@/lib/spine/ratelimit";

export async function POST(req: Request) {
  // Abuse guard: cap new accounts per IP (bots probe signup endpoints).
  maybeSweep();
  const rl = rateLimit(`signup:${clientIp(req)}`, 10, 60 * 60_000); // 10/hour
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited", retry_after_sec: rl.retryAfterSec }, { status: 429 });
  }

  let name = "Untitled";
  try {
    const body = await req.json();
    if (body?.name) name = String(body.name).slice(0, 80);
  } catch {
    /* name optional */
  }
  const acct = createAccount(name);
  // The api_key is shown ONCE on creation — the caller must store it.
  return NextResponse.json({
    id: acct.id,
    name: acct.name,
    api_key: acct.api_key,
    plan: acct.plan,
    balance_usd: (acct.balance_micros / 1_000_000).toFixed(6),
  });
}

export async function GET(req: Request) {
  const key = (req.headers.get("authorization")?.replace(/^Bearer /, "") || req.headers.get("x-api-key") || "").trim();
  const acct = key ? getAccountByApiKey(key) : undefined;
  if (!acct) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({
    id: acct.id,
    name: acct.name,
    plan: acct.plan,
    balance_usd: (acct.balance_micros / 1_000_000).toFixed(6),
    balance_micros: acct.balance_micros,
  });
}
