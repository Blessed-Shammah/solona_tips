# payments-core — runnable safety reference

The network-free heart of `solana-payments-skill`, as code you can run. These are the pure
functions where money bugs actually live (decimals, mint/program checks, exactly-once crediting,
period idempotency). They make the safety laws in [`../../rules/payments.md`](../../rules/payments.md)
**executable**, not just prose.

## Run

```bash
node --test 'examples/**/*.test.mjs'     # zero dependencies, Node 18+
```

Current status: **9/9 passing** (verified on Node 22). Each test names the safety law it enforces.

| Test | Law | Proves |
|------|-----|--------|
| decimals math | #3 | integer-only base units; rejects too-many-places / float drift |
| Solana Pay URL | — | unique `reference` + `spl-token` carried correctly |
| exact / under / over | #4, #8 | underpay rejected, overpay flagged (not silently kept) |
| wrong token program | #2 | SPL-vs-Token-2022 mismatch rejected |
| spoof mint | #2 | a different token to the same reference does NOT credit |
| webhook replay | #5 | same signature credits exactly once |
| double-pay | #8 | two distinct transfers → credit once, flag the extra for refund |
| subscription period | — | one charge per (sub, period) even if the scheduler runs twice |

## Scope (honest boundary)

- ✅ **Here:** the deterministic, network-free logic — runs anywhere, in CI, with no validator.
- ➡️ **Not here (needs a validator):** `getSignaturesForAddress`, real `transferChecked`, and the
  real Token-2022 PYUSD path. Those are the integration tests described in
  [`../../skill/testing.md`](../../skill/testing.md); run them on a Surfpool **mainnet-fork** to go
  from *source-verified* to *execution-verified*. The commented `integration-mainnet-fork` job in
  `.github/workflows/ci.yml` is where they belong.

This split is deliberate: the safety properties that catch the expensive bugs are provable without a
network, so they gate every commit; the chain-dependent checks run where a fork is available.
