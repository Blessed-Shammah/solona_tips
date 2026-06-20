// POST /api/account/upgrade — start a Pro upgrade. Returns a payment (Solana Pay) the account must
// settle; the plan flips to Pro only after the payment is verified on-chain (exactly-once).
// Hardened: no longer a free toggle.
import { NextResponse } from "next/server";
import { accountFromRequest } from "@/lib/spine/api-auth";
import { createUpgradeOrder, PRO_PRICE_USD } from "@/lib/spine/credits";

export async function POST(req: Request) {
  const account = accountFromRequest(req);
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (account.plan === "pro") return NextResponse.json({ error: "already on Pro" }, { status: 400 });

  const handle = await createUpgradeOrder(account.id);
  return NextResponse.json({ ...handle, price_usd: PRO_PRICE_USD });
}
