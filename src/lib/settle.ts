// settle.ts — the convergence point. Both the client status poll (Track A, fast) and the cron
// reconciler (Track B, safe) call this. Verification is the source of truth; crediting is
// exactly-once (Safety Law #6). Calling it twice concurrently is safe — the DB unique index decides.
import { verifyInvoice } from "./verify";
import {
  type Invoice,
  creditOnce,
  markPaid,
  markStatus,
  paymentsFor,
  getInvoice,
} from "./db";
import { commitmentForAmount } from "./config";

export interface SettleSummary {
  status: Invoice["status"];
  credited: number; // valid transfers credited to this invoice
  refundDue: boolean; // a genuine double-pay / overpay needs returning (reconciliation.md)
  inspected: number;
}

export async function settleInvoice(invoice: Invoice): Promise<SettleSummary> {
  // Already settled — nothing to do, but report the truth.
  if (invoice.status === "paid") {
    const pays = paymentsFor(invoice.id);
    return { status: "paid", credited: pays.length, refundDue: pays.some((p) => p.refund_due), inspected: 0 };
  }

  // Pick the commitment by value (confirmation.md). Stablecoins are ~$1; SOL has no on-chain price
  // here, so we wait for `confirmed` unless you raise the bar. High-value → finalized.
  const amountUsd = invoice.is_native ? 0 : Number(invoice.amount_decimal);
  const commitment = commitmentForAmount(amountUsd);

  const result = await verifyInvoice(invoice, commitment);

  let creditedExtra = false;
  for (const p of result.payments) {
    const outcome = creditOnce(invoice.id, p.signature, p.received, p.status);
    if (outcome === "credited_extra") creditedExtra = true;
    // "duplicate" is the exactly-once guard doing its job — silently fine.
  }

  const pays = paymentsFor(invoice.id);
  if (pays.length > 0) {
    markPaid(invoice.id);
  } else if (invoice.expires_at < Date.now() && result.inspected === 0) {
    // No payment ever touched the reference and the window closed → expire it.
    markStatus(invoice.id, "expired");
  }

  const fresh = getInvoice(invoice.id)!;
  return {
    status: fresh.status,
    credited: pays.length,
    refundDue: creditedExtra || pays.some((p) => p.refund_due),
    inspected: result.inspected,
  };
}
