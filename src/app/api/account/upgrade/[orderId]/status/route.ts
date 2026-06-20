// GET /api/account/upgrade/:orderId/status — poll the upgrade payment; flips to Pro exactly-once.
import { NextResponse } from "next/server";
import { settleUpgrade } from "@/lib/spine/credits";

export async function GET(_req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params;
  try {
    const r = await settleUpgrade(orderId);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ status: "pending", applied: false, error: (e as Error).message });
  }
}
