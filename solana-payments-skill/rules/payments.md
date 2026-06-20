---
description: Safety laws for Solana stablecoin payments. Auto-load whenever payment, checkout,
  transfer, settlement, webhook, or reconciliation code is written or reviewed.
globs: ["**/*payment*", "**/*checkout*", "**/*webhook*", "**/*reconcil*", "**/*invoice*", "**/*settle*"]
alwaysApply: false
---

# Payment Safety Laws (non-negotiable)

These override convenience. If an example violates one, the example is wrong. A payments bug does
not throw — it silently moves money. Treat every law as load-bearing.

1. **Server is the source of truth for amount, recipient, and mint.** Never accept a price, payee,
   or token from the client. Derive them server-side from the order/invoice; the client only learns
   *which* invoice to pay (a `reference`), never *how much* or *to whom* in a way the server trusts.

2. **Verify the mint, not the symbol.** Symbols are not unique and can be spoofed. Match the exact
   mint address (see `resources.md`) **and** the token program. USDC/USDG = SPL Token program;
   PYUSD = Token-2022. Using the wrong program ID or assuming one program fails or misroutes.

3. **Never hardcode decimals — use `transferChecked`.** Read decimals from the mint at runtime and
   transfer with `transferChecked` (which asserts amount *and* decimals on-chain). A hardcoded
   decimal that drifts from the mint sends 1000× or 1/1000× the intended amount.

4. **"Paid" = confirmed at the required commitment + fully verified.** A payment counts only when
   the transaction is `confirmed`/`finalized` per your value threshold **and** amount, mint,
   recipient ATA, and `reference` all match the expected invoice. `processed` is not paid.

5. **Every charge has an idempotency key; crediting is exactly-once.** Derive a stable key
   (invoice id + reference). A webhook/poller may deliver the same payment many times — credit it
   once, guarded by a unique constraint, never by "have I seen this in memory".

6. **Reconciliation is the source of truth; webhooks are a hint.** Webhooks can be missed, delayed,
   replayed, or forged. Always back them with a poller over the invoice `reference`
   (`getSignaturesForAddress`) and verify the on-chain transaction yourself before crediting.

7. **No private keys in code, logs, or examples.** Use environment-injected signers and abstract
   them behind a signer interface. A key in a repo or a log line is a drained treasury.

8. **Match exact transfer amount; define under/over-payment policy explicitly.** Decide up front how
   you treat partial and excess payments (reject, credit-as-partial, refund-the-excess) — never let
   "close enough" silently settle.

9. **Use a fresh, unique `reference` per invoice.** It is your client-side correlation id and the
   index key for reconciliation. Reusing one collides two payments into one invoice.

> When any of these conflicts with a code sample, fix the sample. See `skill/SKILL.md` for routing
> and `skill/confirmation.md` / `skill/reconciliation.md` for the enforcing implementations.
