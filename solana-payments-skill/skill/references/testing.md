# testing.md — prove it before you trust it

**Goal:** no payment path ships as "working" without a test that exercises it. Money code that's
only been read, not run, is unverified. This file gives the harness and the assertions.

## Environments

| Env | Use | How |
|-----|-----|-----|
| **LiteSVM / Mollusk** | Fast unit tests of transfer/verify logic | in-process, no validator |
| **`solana-test-validator`** | Local integration, full RPC incl. `getSignaturesForAddress` | local devnet |
| **Surfpool (mainnet-fork)** | Test against **real mints** (USDC/USDG/PYUSD) + real token programs | fork mainnet state |
| **Devnet** | End-to-end with wallets, faucet tokens | public devnet |

Use a **mainnet-fork** to test the SPL-vs-Token-2022 distinction with the *actual* PYUSD mint — that
bug doesn't show up against a toy SPL mint you created.

## The tests that must exist (mapped to safety laws)

1. **Happy path:** create invoice → pay exact amount → `getSignaturesForAddress(reference)` finds it
   → verify mint/recipient/amount → credit once. Asserts the full `checkout→confirmation→recon` loop.
2. **Wrong mint (Law #2):** pay with a *different* token to the same reference → must NOT credit.
3. **Decimals (Law #3):** assert `transferChecked` rejects a mismatched-decimals transfer.
4. **Underpayment (Law #8):** pay less → status `underpaid`, no delivery.
5. **Overpayment (Law #8):** pay more → credit + excess queued for refund.
6. **Double-pay (Law #5):** two transfers to one reference → credited exactly once; extra flagged.
7. **Webhook replay (Law #5/#6):** deliver the same webhook twice → unique constraint → one credit.
8. **Missed webhook (Law #6):** skip the webhook, run only the poller → still credited (backfill).
9. **Forged webhook (Law #6):** unsigned/invalid-secret delivery → rejected, no credit.
10. **Token-2022 path:** run the happy path against the PYUSD mint on a fork → correct program used.
11. **Refund (refunds-disputes):** refund ≤ paid succeeds and confirms; over-refund rejected; retry
    of a refund job pays once.
12. **Subscription period idempotency:** scheduler runs twice for one period → one charge.

## Assertion helpers

```ts
// derive received amount from token balance deltas, not from your own request
function tokenBalanceDelta(tx, ata, mint): bigint { /* post - pre for (ata, mint) */ }

// exactly-once: second credit attempt must be a no-op, not an error to the caller
async function assertCreditedOnce(invoiceId) { /* count payments rows == 1 */ }
```

## CI gate

Run tiers 1–9 on `solana-test-validator` in CI; run 10 (Token-2022 vs real mint) on a scheduled
mainnet-fork job. **A red money-test blocks merge** — there is no "flaky payment test we'll ignore".

> Status note for this repo: code samples are written against the verified `@solana/kit` /
> Solana Pay surface in `resources.md`. Before a production launch, run the suite above on a
> mainnet-fork — that run is the line between "source-verified" and "execution-verified".
