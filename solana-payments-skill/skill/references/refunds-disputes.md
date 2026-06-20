# refunds-disputes.md — refunds, partials, disputes

**Goal:** return funds safely and leave an audit trail. Crypto has **no chargeback** — once you
send, it's gone — so refunds are deliberate outbound payments you initiate, and disputes are a
process you design, not a network feature.

## Refund = a new outbound transfer

There is no "reverse the transaction". You send a fresh `transferChecked` from the merchant treasury
back to the payer, referencing the original payment.

```ts
// refund links to the original on-chain payment for a clean trail
async function refund(payment, amountBaseUnits /* ≤ payment.amount */) {
  assert(amountBaseUnits <= payment.amount, "no over-refund");        // never refund more than paid
  const refundRef = (await generateKeyPairSigner()).address;
  await db.refunds.insert({
    paymentId: payment.id, amount: amountBaseUnits, reference: refundRef,
    idempotencyKey: `refund:${payment.id}:${amountBaseUnits}`,        // exactly-once outbound
    status: "pending",
  });
  // build transferChecked(merchantAta → payerAta, amount), confirm, then mark refunded.
}
```

## Rules

1. **Know the payer's address before refunding.** Capture it at payment time (from the verified tx)
   so a refund goes to the real sender, not a user-typed address (Safety Law #1 applies outbound).
2. **Never over-refund.** Sum prior refunds; cap total ≤ original (full + partials).
3. **Refunds are exactly-once too.** Idempotency key + unique constraint, same as crediting — a
   retried refund job must not pay twice.
4. **Confirm refunds before marking refunded.** Use `confirmation.md` discipline on the outbound tx.
5. **Mind the rail/program.** Refund in the **same mint**, under the **same token program** the
   payment used (PYUSD = Token-2022).

## Partial refunds & overpayment returns

Partial = refund < original. Track cumulative refunded amount on the payment. The overpayment case
from `confirmation.md` is just a partial refund of the excess — same code path.

## Disputes (you design the process)

No network arbitration exists. Build:
- An evidence trail: invoice, verified tx signatures, delivery proof, timestamps.
- A status machine: `open → under_review → resolved(refund|deny)`.
- A policy for who can authorize refunds (ties into `treasury.md` multisig for large amounts).

`★ Mental model:` on card rails the network can claw funds back; on Solana **you** are the clearing
house. Every reversal is an intentional, signed, confirmed, recorded outbound payment.

→ Where the funds live and who signs large refunds: `treasury.md`.
