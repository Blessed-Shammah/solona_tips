// GET /api/credits/:orderId/status — poll a top-up. On settlement it applies the credit to the
// account balance exactly-once (idempotent; the reconcile cron does the same safely).
import { NextResponse } from "next/server";
import { settleTopUp } from "@/lib/spine/credits";

export async function GET(_req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params;
  try {
    const status = await settleTopUp(orderId);
    return NextResponse.json({
      status: status.status,
      applied: status.applied,
      balance_usd: (status.balanceMicros / 1_000_000).toFixed(6),
    });
  } catch (e) {
    return NextResponse.json({ status: "pending", error: (e as Error).message });
  }
}
