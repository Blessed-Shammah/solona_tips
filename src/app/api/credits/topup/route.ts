// POST /api/credits/topup — start a prepaid-credit purchase. Returns a Solana Pay URL/QR to fund
// the account balance. Settlement is applied exactly-once when the payment lands.
import { NextResponse } from "next/server";
import { accountFromRequest } from "@/lib/spine/api-auth";
import { createTopUp } from "@/lib/spine/credits";
import { toBaseUnits } from "@/lib/payments-core.mjs";

export async function POST(req: Request) {
  const account = accountFromRequest(req);
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let amount = "";
  try {
    amount = String((await req.json())?.amount ?? "").trim();
  } catch {
    /* validated below */
  }
  try {
    toBaseUnits(amount, 6); // validate as a USDC amount (rejects junk / too many decimals)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const handle = await createTopUp(account.id, amount);
  return NextResponse.json(handle);
}
