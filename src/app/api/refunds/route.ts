// POST /api/refunds — scan flagged overpay/double-pay and record refunds owed (admin-gated).
// GET  /api/refunds — list recorded refunds.
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { processRefunds } from "@/lib/spine/refunds";
import { listRefunds } from "@/lib/spine/store";
import { config } from "@/lib/config";

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const result = await processRefunds(config.merchantAddress);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ refunds: listRefunds() });
}
