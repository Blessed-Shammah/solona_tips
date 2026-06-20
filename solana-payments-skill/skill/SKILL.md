---
name: solana-payments
description: Use when accepting, confirming, reconciling, or refunding stablecoin payments on
  Solana (USDC, USDG, PYUSD) — Solana Pay checkout & links, subscriptions, safe confirmation &
  idempotency, webhook-to-ledger reconciliation, refunds, on/off-ramp, treasury, compliance basics.
  Triggers on "accept USDC", "Solana Pay", "did the payment settle", "reconcile payments",
  "stablecoin checkout", "crypto subscription".
argument-hint: "[checkout|confirm|reconcile|subscribe|refund|treasury] <what you're paying for>"
user-invocable: true
license: MIT
---

# Solana Payments — Skill Hub

The skill an agent loads the moment a builder says *"let users pay me in USDC/USDG/PYUSD."* From
checkout to **confirmed, reconciled, refundable, compliant** settlement.

**Precedence:** `rules/payments.md` (safety laws) > official protocol/provider docs (Solana Pay,
Circle, Paxos, PayPal, Helius) > this skill. Never assert a mint/version from memory — confirm in
`references/resources.md`. New to the space? Read `references/myths.md` first to unlearn the 5
assumptions that cause most payment bugs.

## Route — one primary reference per task

| If the builder is trying to… | Primary | Then |
|------------------------------|---------|------|
| Pick a stablecoin; set up mints, ATAs, token program | `references/rails.md` | `references/resources.md` |
| Build a QR / payment-link checkout (Solana Pay) | `references/solana-pay.md` | `references/checkout.md` |
| Wire a full web checkout (server creates request, client pays) | `references/checkout.md` | `references/confirmation.md` |
| Charge recurring / subscriptions | `references/subscriptions.md` | `references/confirmation.md` |
| Answer "did I *really* get paid?" | `references/confirmation.md` | `references/reconciliation.md` |
| Match on-chain payments to my database | `references/reconciliation.md` | `references/confirmation.md` |
| Refund, partial-refund, or handle a dispute | `references/refunds-disputes.md` | `references/treasury.md` |
| Move money to/from fiat | `references/onramp-offramp.md` | `references/compliance.md` |
| Screen/record payments for compliance | `references/compliance.md` | → `crypto-legal` skill |
| Hold and settle funds safely | `references/treasury.md` | `references/refunds-disputes.md` |
| Test any flow on devnet / mainnet-fork | `references/testing.md` | — |
| Debunk a payment misconception | `references/myths.md` | — |

## Decision shortcuts

- **Which rail?** Default **USDC** (deepest liquidity, classic SPL). **USDG** for Global Dollar
  Network; **PYUSD** for PayPal reach — PYUSD is **Token-2022**: code for both programs and check
  the **transfer-fee / transfer-hook** extensions (received may be < sent). → `references/rails.md`.
- **"Did it land?"** Attach a unique `reference` pubkey, index it with `getSignaturesForAddress`,
  then **verify the transfer yourself** (the `@solana/pay` `validateTransfer` path has a known
  multi-transfer edge case). → `references/confirmation.md`.
- **Recurring on Solana?** No native recurring primitive. Primary: token **delegate/approval** +
  off-chain scheduler within the approved allowance. → `references/subscriptions.md`.

## Hand-offs (don't reinvent)

- Custom on-chain programs / PDAs / CPIs / Token-2022 transfer-hook programs → **`solana-dev`**.
- NFT or token-mint mechanics → **`metaplex`** / token skills.
- Legal entity, licensing, jurisdiction, KYC policy → **`crypto-legal`** skill.
- Trading, LP, IL, oracle pricing → **out of scope** (`position-manager` skill).

## Agents & commands (this repo)

- `agents/payments-engineer.md` — implements checkout/confirmation/reconciliation.
- `agents/compliance-reviewer.md` — adversarial: double-pay, replay, screening, key handling.
- `agents/payments-reviewer.md` — PhD-level audit of the skill itself (accuracy + 2026 fit).
- `/scaffold-checkout` · `/reconcile`.

**Golden rule:** payments code that is wrong loses money. Verify facts (`references/resources.md`),
obey the safety laws (`rules/payments.md`), and test before you trust (`references/testing.md`).
