// solana-adapter.ts — the FIRST payment adapter. Wraps the existing exactly-once Solana settlement
// engine behind the rail-agnostic PaymentAdapter interface. A future Stripe/bank adapter implements
// the same shape; nothing above this file changes when we add rails.
import { generateKeyPairSigner } from "@solana/kit";
import { resolveRail } from "../rails";
import { createInvoice, getInvoice, paymentsFor } from "../db";
import { config } from "../config";
import { settleInvoice } from "../settle";
import { toBaseUnits, buildSolanaPayUrl, fromBaseUnits } from "../payments-core.mjs";
import type { PaymentAdapter, ChargeRequest, ChargeHandle, VerifiedSettlement } from "./adapter";

const TTL_MS = 15 * 60_000;

/** Scale a rail's base units to canonical 6-dp USDC-equivalent micros (assumes 1:1 stablecoin). */
function toCreditMicros(received: bigint, decimals: number): bigint {
  if (decimals === 6) return received;
  return (received * 1_000_000n) / 10n ** BigInt(decimals);
}

export const solanaAdapter: PaymentAdapter = {
  id: "solana",

  async charge(req: ChargeRequest): Promise<ChargeHandle> {
    const rail = await resolveRail(req.rail || "USDC");
    const baseUnits = toBaseUnits(req.amountDecimal, rail.decimals);
    if (baseUnits <= 0n) throw new Error("amount must be greater than zero");

    const reference = (await generateKeyPairSigner()).address; // Safety Law #9: fresh, unique
    const now = Date.now();
    const amountDecimal = fromBaseUnits(baseUnits, rail.decimals);

    const inv = createInvoice({
      id: req.orderId,
      reference,
      rail_id: rail.id,
      mint: rail.mint,
      token_program: rail.tokenProgram,
      decimals: rail.decimals,
      is_native: rail.isNative,
      amount_decimal: amountDecimal,
      amount_base_units: baseUnits.toString(),
      merchant_address: config.merchantAddress,
      label: config.merchantLabel,
      message: req.memo || "",
      created_at: now,
      expires_at: now + TTL_MS,
    });

    const payUri = buildSolanaPayUrl({
      recipient: config.merchantAddress,
      amountDecimal,
      mint: rail.isNative ? undefined : rail.mint,
      reference,
      label: config.merchantLabel,
      message: req.memo || req.orderId,
    });

    return {
      reference: inv.id,
      instructions: {
        payUri,
        rail: rail.id,
        amountDecimal,
        recipient: config.merchantAddress,
        expiresAt: inv.expires_at,
      },
    };
  },

  async verify(reference: string): Promise<VerifiedSettlement> {
    const inv = getInvoice(reference);
    if (!inv) return { status: "pending", receivedBaseUnits: 0n, creditMicros: 0n, refundDue: false };

    const summary = await settleInvoice(inv);
    const fresh = getInvoice(reference)!;
    const pays = paymentsFor(reference);
    const received = pays.reduce((acc, p) => acc + BigInt(p.amount_base_units), 0n);
    const settlementId = pays[0]?.tx_signature;

    const status: VerifiedSettlement["status"] =
      fresh.status === "paid" ? "settled" :
      fresh.status === "underpaid" ? "underpaid" :
      fresh.status === "expired" ? "expired" : "pending";

    return {
      status,
      receivedBaseUnits: received,
      creditMicros: toCreditMicros(received, inv.decimals),
      settlementId,
      refundDue: summary.refundDue,
    };
  },
};
