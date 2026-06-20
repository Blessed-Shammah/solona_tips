// verify.ts — turn a wallet's "sent" into a server-proven "paid" (confirmation.md).
// We DISCOVER the paying tx via the invoice's unique `reference`, then VERIFY the transfer
// ourselves from on-chain balance deltas. We deliberately do not rely on @solana/pay's
// validateTransfer (documented multi-transfer edge case) — our balance-delta check is the authority.
import { rpc, toAddress } from "./solana";
import { verifyTransfer, verifyNativeTransfer } from "./payments-core.mjs";
import type { Invoice } from "./db";

export interface VerifiedPayment {
  signature: string;
  received: bigint; // base units actually landed in the merchant wallet
  status: "exact" | "overpaid";
}

export interface VerifyResult {
  /** Verified, creditable payments (>= expected) found for this invoice's reference. */
  payments: VerifiedPayment[];
  /** True if at least one signature touched the reference but underpaid / failed. */
  sawUnderpaidOrFailed: boolean;
  /** Number of on-chain signatures inspected for the reference. */
  inspected: number;
}

/**
 * Find and verify all payments to an invoice's `reference`.
 * Returns every fully-verified transfer (the caller credits exactly-once and refunds extras).
 */
export async function verifyInvoice(
  invoice: Invoice,
  commitment: "confirmed" | "finalized",
): Promise<VerifyResult> {
  const expected = BigInt(invoice.amount_base_units);

  // 1. Locate candidate signatures that touched this invoice's reference key.
  const sigs = await rpc
    .getSignaturesForAddress(toAddress(invoice.reference), { limit: 20 }, )
    .send();

  const result: VerifyResult = { payments: [], sawUnderpaidOrFailed: false, inspected: sigs.length };
  if (sigs.length === 0) return result;

  for (const entry of sigs) {
    const signature = entry.signature;

    // 2. Fetch the transaction at the value-appropriate commitment.
    const tx = await rpc
      .getTransaction(signature, {
        commitment,
        encoding: "jsonParsed",
        maxSupportedTransactionVersion: 0,
      })
      .send();

    if (!tx) continue; // not yet at the required commitment — still pending
    if (tx.meta?.err) {
      result.sawUnderpaidOrFailed = true;
      continue;
    }

    // 3. Verify the transfer from balance deltas — never trust that the tx merely exists.
    if (invoice.is_native) {
      const accountKeys = (tx.transaction.message.accountKeys ?? []) as ReadonlyArray<{ pubkey: string }>;
      const merchantAccountIndex = accountKeys.findIndex((k) => String(k.pubkey) === invoice.merchant_address);
      if (merchantAccountIndex < 0) {
        result.sawUnderpaidOrFailed = true;
        continue;
      }
      const v = verifyNativeTransfer(
        { signature, err: tx.meta?.err, meta: tx.meta as never },
        { merchantAccountIndex, expectedBaseUnits: expected },
      );
      collect(v, result);
    } else {
      const v = verifyTransfer(
        { signature, err: tx.meta?.err, tokenProgram: invoice.token_program, meta: tx.meta as never },
        {
          mint: invoice.mint,
          tokenProgram: invoice.token_program,
          merchantOwner: invoice.merchant_address,
          expectedBaseUnits: expected,
        },
      );
      collect(v, result);
    }
  }

  return result;
}

function collect(
  v: { ok: boolean; status?: string; received?: bigint; signature?: string },
  result: VerifyResult,
): void {
  if (v.ok && v.signature && (v.status === "exact" || v.status === "overpaid")) {
    result.payments.push({ signature: v.signature, received: v.received ?? 0n, status: v.status });
  } else {
    result.sawUnderpaidOrFailed = true;
  }
}
