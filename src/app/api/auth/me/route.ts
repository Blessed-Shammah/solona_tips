// GET /api/auth/me — the logged-in account (incl. its API key + profile info, for the owner's UI).
import { NextResponse } from "next/server";
import { sessionAccountFromRequest } from "@/lib/spine/session";
import { accountUsageSummary } from "@/lib/spine/store";

export function GET(req: Request) {
  const account = sessionAccountFromRequest(req);
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const usage = accountUsageSummary(account.id);
  return NextResponse.json({
    id: account.id,
    name: account.name,
    email: account.email ?? null,
    plan: account.plan,
    api_key: account.api_key,
    balance_usd: (account.balance_micros / 1_000_000).toFixed(6),
    balance_micros: account.balance_micros,
    created_at: account.created_at,
    usage: { calls: usage.calls, spent_usd: (usage.spentMicros / 1_000_000).toFixed(4) },
  });
}
