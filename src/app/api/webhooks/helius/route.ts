// POST /api/webhooks/helius — instant-settlement hint. Helius calls this when a watched address
// (a merchant wallet) sees activity. Per Safety Law #6, the webhook is only a HINT: we verify its
// configured secret, then trigger an on-chain reconciliation pass that re-verifies every open
// invoice and credits exactly-once. We NEVER credit from the webhook body.
//
// Setup: create a Helius webhook for your MERCHANT_ADDRESS, set its "Auth Header" to
// HELIUS_WEBHOOK_SECRET, and point it at https://YOUR_HOST/api/webhooks/helius.
import { NextResponse } from "next/server";
import { runReconcilePass } from "@/lib/reconcile";

export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.HELIUS_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhooks not configured (set HELIUS_WEBHOOK_SECRET)" }, { status: 503 });
  }
  // Helius sends the configured value in the Authorization header. Reject anything else.
  const auth = req.headers.get("authorization") || "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  if (provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Drain the body (not trusted; logged-size only) so the connection completes cleanly.
  try { await req.text(); } catch { /* ignore */ }

  // The hint says "go look now" — reconcile on-chain (exactly-once crediting inside).
  try {
    const summary = await runReconcilePass();
    return NextResponse.json({ ok: true, checked: summary.checked, newlyPaid: summary.newlyPaid, creditsApplied: summary.creditsApplied, upgradesApplied: summary.upgradesApplied });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
