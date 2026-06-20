// GET /api/invoice/:id/status — the client polls this. It triggers a verification pass (Track A,
// fast) and returns the SERVER's verdict. Success is revealed only when the server says "paid",
// never when the wallet reports "sent" (checkout.md).
import { NextResponse } from "next/server";
import { getInvoice } from "@/lib/db";
import { settleInvoice } from "@/lib/settle";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const invoice = getInvoice(id);
  if (!invoice) return NextResponse.json({ error: "not found" }, { status: 404 });

  let status = invoice.status;
  let refundDue = false;
  if (status === "pending") {
    try {
      const summary = await settleInvoice(invoice);
      status = summary.status;
      refundDue = summary.refundDue;
    } catch (e) {
      // RPC hiccup — report still pending; the cron reconciler (Track B) will catch it.
      return NextResponse.json({
        status: invoice.status,
        amount: invoice.amount_decimal,
        rail: invoice.rail_id,
        note: "verification temporarily unavailable; will retry",
        error: (e as Error).message,
      });
    }
  }

  return NextResponse.json({
    status,
    amount: invoice.amount_decimal,
    rail: invoice.rail_id,
    refundDue,
    expiresAt: invoice.expires_at,
  });
}
