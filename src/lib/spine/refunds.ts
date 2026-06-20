// refunds.ts — execute or surface refunds owed (overpay / double-pay flagged by reconciliation).
// Live token payouts are guarded by a DB refund attempt row before signing, then completed with the
// on-chain tx signature. Without a signer, payer, or token rail, the row stays manual_required.
import { signature as toSignature } from "@solana/kit";
import { rpc } from "../solana";
import { getInvoice, type Invoice } from "../db";
import {
  beginRefundAttempt,
  listRefundDuePayments,
  markRefundFailed,
  markRefundManualRequired,
  markRefundSent,
  type RefundDuePayment,
} from "./store";
import { refundSignerEnabled, sendTokenRefund } from "./refund-payout";

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
  sent: number;
  manualRequired: number;
  failed: number;
  signerEnabled: boolean;
}

export async function processRefunds(merchant: string): Promise<RefundProcessResult> {
  const due: RefundDuePayment[] = listRefundDuePayments();
  let recorded = 0;
  let sent = 0;
  let manualRequired = 0;
  let failed = 0;
  const signerEnabled = refundSignerEnabled();
  for (const p of due) {
    const inv = getInvoice(p.invoice_id);
    if (!inv) continue;
    const refundBaseUnits = refundBaseUnitsForPayment(p, inv);
    if (refundBaseUnits <= 0n) continue;
    const decimals = inv?.decimals ?? 6;
    const micros = Number((refundBaseUnits * 1_000_000n) / 10n ** BigInt(decimals));
    const payer = inv && !inv.is_native ? await resolvePayer(p.tx_signature, merchant, inv.mint) : null;
    const attempt = beginRefundAttempt(p.payment_id, p.invoice_id, micros, payer);
    if (!attempt.started) continue;
    recorded++;

    if (!signerEnabled || !payer || inv.is_native) {
      markRefundManualRequired(attempt.id, p.payment_id);
      manualRequired++;
      continue;
    }

    try {
      const txSig = await sendTokenRefund({
        merchantAddress: merchant,
        payerAddress: payer,
        mint: inv.mint,
        tokenProgram: inv.token_program,
        amountBaseUnits: refundBaseUnits,
        decimals: inv.decimals,
      });
      markRefundSent(attempt.id, p.payment_id, txSig);
      sent++;
    } catch {
      markRefundFailed(attempt.id);
      failed++;
    }
  }
  return { due: due.length, recorded, sent, manualRequired, failed, signerEnabled };
}

function refundBaseUnitsForPayment(payment: RefundDuePayment, invoice: Invoice): bigint {
  const received = BigInt(payment.amount_base_units);
  if (payment.is_extra) return received;
  if (payment.status === "overpaid") return received - BigInt(invoice.amount_base_units);
  return received;
}
