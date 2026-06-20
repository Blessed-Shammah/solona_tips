---
description: Wire exactly-once webhook→ledger reconciliation for Solana stablecoin payments.
---

# /reconcile

Stand up the two-track reconciliation from `reconciliation.md`. Steps:

1. Load `skill/SKILL.md` + `rules/payments.md`. Confirm the ledger schema has a **unique index** on
   `(invoice_id, tx_signature)` — create it if missing (this is what makes crediting exactly-once).
2. **Track A (webhook):** generate a Helius webhook receiver that (a) verifies the signing secret,
   (b) treats the body as untrusted, (c) extracts only signature/reference, (d) enqueues for the
   verifier. Reject unsigned/forged deliveries.
3. **Track B (poller):** generate a cron that walks open invoices' `reference` history via
   `getSignaturesForAddress` and enqueues candidates — catching missed webhooks and backfilling
   after downtime.
4. **Verifier:** apply `confirmation.md` checks (mint+program, recipient ATA, amount ≥ expected,
   commitment) then `creditOnce()` guarded by the unique constraint.
5. **Drift job:** periodically compare `Σ credited − Σ refunded − Σ swept` to on-chain balances;
   alert on mismatch.
6. Generate the replay, missed-webhook, and forged-webhook tests from `testing.md`; run them; report
   results honestly.
