// POST /api/checkout — server-authoritative invoice creation (checkout.md, Safety Laws #1 + #9).
// The client only chooses a rail and an amount to REQUEST; the server derives the mint, decimals,
// token program, recipient, and a fresh unique `reference` — none of which the client can forge.
import { NextResponse } from "next/server";
import { generateKeyPairSigner } from "@solana/kit";
import { randomUUID } from "node:crypto";
import { resolveRail } from "@/lib/rails";
import { createInvoice } from "@/lib/db";
import { config } from "@/lib/config";
import { isAuthorized } from "@/lib/auth";
import { toBaseUnits, buildSolanaPayUrl, fromBaseUnits } from "@/lib/payments-core.mjs";

const TTL_MS = 15 * 60_000; // 15-minute invoice window (checkout.md expiry)

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { rail?: string; amount?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const railId = (body.rail || "").toString();
  const amount = (body.amount ?? "").toString().trim();
  const message = (body.message || "").toString().slice(0, 120);

  // Resolve the rail ON-CHAIN (decimals + token program), never from a client-supplied symbol.
  let rail;
  try {
    rail = await resolveRail(railId);
  } catch (e) {
    return NextResponse.json({ error: `rail: ${(e as Error).message}` }, { status: 400 });
  }

  // Integer-only money math; rejects float drift / too many decimals (Safety Law #3).
  let baseUnits: bigint;
  try {
    baseUnits = toBaseUnits(amount, rail.decimals);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  if (baseUnits <= 0n) {
    return NextResponse.json({ error: "amount must be greater than zero" }, { status: 400 });
  }

  const merchant = config.merchantAddress;

  // Fresh, unique reference per invoice (Safety Law #9). We only keep the PUBLIC key; the secret
  // is never needed and never stored — it's purely a correlation id the wallet attaches on-chain.
  const reference = (await generateKeyPairSigner()).address;
  const id = randomUUID();
  const now = Date.now();
  const amountDecimal = fromBaseUnits(baseUnits, rail.decimals);

  const invoice = createInvoice({
    id,
    reference,
    rail_id: rail.id,
    mint: rail.mint,
    token_program: rail.tokenProgram,
    decimals: rail.decimals,
    is_native: rail.isNative,
    amount_decimal: amountDecimal,
    amount_base_units: baseUnits.toString(),
    merchant_address: merchant,
    label: config.merchantLabel,
    message,
    created_at: now,
    expires_at: now + TTL_MS,
  });

  const solanaPayUrl = buildSolanaPayUrl({
    recipient: merchant,
    amountDecimal,
    mint: rail.isNative ? undefined : rail.mint,
    reference,
    label: config.merchantLabel,
    message: message || `Payment ${id.slice(0, 8)}`,
  });

  // Honor reverse-proxy headers so the shared link uses the public host, not the container's.
  const fwdHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const fwdProto = req.headers.get("x-forwarded-proto") || new URL(req.url).protocol.replace(":", "");
  const origin = fwdHost ? `${fwdProto}://${fwdHost}` : new URL(req.url).origin;
  return NextResponse.json({
    id: invoice.id,
    rail: rail.id,
    amount: amountDecimal,
    cluster: config.cluster,
    solanaPayUrl,
    payPageUrl: `${origin}/pay/${invoice.id}`,
    expiresAt: invoice.expires_at,
  });
}
