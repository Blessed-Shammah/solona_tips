// GET /api/account/usage — recent metered calls for the authenticated account (dashboard feed).
import { NextResponse } from "next/server";
import { accountFromRequest } from "@/lib/spine/api-auth";
import { listUsage } from "@/lib/spine/store";

export async function GET(req: Request) {
  const account = accountFromRequest(req);
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = listUsage(account.id, 25).map((u) => ({
    tool: u.tool_slug,
    cost_usd: (u.cost_micros / 1_000_000).toFixed(6),
    at: u.created_at,
  }));
  return NextResponse.json({ usage: rows });
}
