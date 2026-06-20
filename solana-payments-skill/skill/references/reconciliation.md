# reconciliation.md — webhook → ledger, exactly once

**Goal:** make crediting **exactly-once** and **provable**, even though webhooks lie (miss, delay,
replay, spoof). Obeys Safety Laws #5, #6. This is the skill's most novel, most valuable reference.

## The core principle (Safety Law #6)

> **Webhooks are a hint. Reconciliation is the source of truth.**

Never credit straight from a webhook payload. A webhook tells you *"go look at the chain now"*. You
then verify on-chain yourself (`confirmation.md`) and credit under a uniqueness guard.

## Two-track design

```
Track A (fast):  Helius webhook → enqueue { reference|signature } → verifier
Track B (safe):  cron poller over open invoices' references → enqueue → verifier
                 (catches everything the webhook missed; also backfills after downtime)
Verifier: confirmation.md checks → credit exactly once (idempotent) → mark invoice paid
```

Track B alone is correct but slow; Track A makes it feel instant. You need both.

## Exactly-once crediting

The ledger write is guarded by a **unique constraint**, not by application logic:

```sql
-- one credit per (invoice, on-chain signature); replays hit the constraint and no-op
CREATE UNIQUE INDEX uniq_credit ON payments (invoice_id, tx_signature);
```

```ts
async function creditOnce(invoice, verifiedTx) {
  try {
    await db.payments.insert({
      invoiceId: invoice.id,
      txSignature: verifiedTx.signature,        // unique per on-chain payment
      amount: verifiedTx.receivedBaseUnits,
      idempotencyKey: invoice.idempotencyKey,
    });
    await db.invoices.markPaid(invoice.id);     // safe: insert above is the gate
  } catch (e) {
    if (isUniqueViolation(e)) return;           // already credited — exactly-once holds
    throw e;
  }
}
```

`★ Why the DB constraint, not an `if`:` two webhook deliveries (or webhook + poller) can run
concurrently. An application-level "have I credited this?" check has a race window between read and
write; a unique index is atomic and decided by the database. This is the line between "usually
once" and "exactly once".

## Verifying a Helius webhook is real

- Configure a signing/auth secret and **verify it on every delivery**; reject unsigned/forged calls.
- Treat the body as untrusted: extract only the `signature`/`reference`, then re-fetch and verify
  the transaction on-chain. Never credit from amounts in the webhook body.

## Replay, backfill, drift

- **Replay:** same signature twice → unique constraint absorbs it.
- **Backfill after downtime:** Track B's poller walks each open invoice's `reference` history; no
  payment is lost just because a webhook fired while you were down.
- **Drift detection:** periodically sum credited payments vs. on-chain inflows to `merchantAta`; a
  mismatch means a missed or mis-credited payment — alert, don't auto-correct silently.

## Double-pay handling

If a reference has two valid transfers (payer retried), credit the invoice once and route the
second to `refunds-disputes.md` for return. Surfacing it is mandatory (Safety Law #8).

→ Return funds: `refunds-disputes.md`. Hold/settle: `treasury.md`. Test it: `testing.md`.
