// refunds.ts — surface and record refunds owed (overpay / double-pay flagged by reconciliation).
// Records each refund EXACTLY ONCE and resolves the payer address on-chain so it can be paid back.
//
// Live on-chain payout requires a merchant signing key (MERCHANT_SECRET_KEY) — the only part of the
// system that isn't purely non-custodial. Until that's wired, refunds are recorded as
// `manual_required` with the resolved payer + amount, ready for an operator (or the admin UI) to send.
import { signature as toSignature } from "@solana/kit";
import { rpc } from "../solana";
import { getInvoice } from "../db";
import { listRefundDuePayments, recordRefundOnce, type RefundDuePayment } from "./store";

export function refundSignerEnabled(): boolean {
  return !!process.env.MERCHANT_SECRET_KEY;
}

/** Best-effort: find who paid (the token account owner whose balance decreased) from the tx. */
export async function resolvePayer(signature: string, merchant: string, mint: string): Promise<string | null> {
  try {
    const tx = await rpc.getTransaction(toSignature(signature), { commitment: "confirmed", encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }).send();
    if (!tx?.meta) return null;
    type Bal = { owner?: string; mint?: string; uiTokenAmount?: { amount?: string } };
    const pre = (tx.meta.preTokenBalances ?? []) as unknown as Bal[];
    const post = (tx.meta.postTokenBalances ?? []) as unknown as Bal[];
    for (const p of pre) {
      if (p.mint !== mint || p.owner === merchant || !p.owner) continue;
      const after = post.find((q) => q.owner === p.owner && q.mint === mint);
      const before = BigInt(p.uiTokenAmount?.amount ?? "0");
      const aft = BigInt(after?.uiTokenAmount?.amount ?? "0");
      if (aft < before) return p.owner; // this owner sent funds → the payer
    }
    return null;
  } catch {
    return null;
  }
}

export interface RefundProcessResult {
  due: number;
  recorded: number;
  signerEnabled: boolean;
}

export async function processRefunds(merchant: string): Promise<RefundProcessResult> {
  const due: RefundDuePayment[] = listRefundDuePayments();
  let recorded = 0;
  for (const p of due) {
    const inv = getInvoice(p.invoice_id);
    const decimals = inv?.decimals ?? 6;
    const micros = Number((BigInt(p.amount_base_units) * 1_000_000n) / 10n ** BigInt(decimals));
    const payer = inv && !inv.is_native ? await resolvePayer(p.tx_signature, merchant, inv.mint) : null;
    // Status stays manual_required until a signer-based payout is wired + verified with a funded key.
    if (recordRefundOnce(p.payment_id, p.invoice_id, micros, payer, "manual_required", null)) recorded++;
  }
  return { due: due.length, recorded, signerEnabled: refundSignerEnabled() };
}
