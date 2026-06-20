# 01 — Build Plan

## Target stack (as of June 2026 — VERIFY each at build time)

> ⚠️ Do not trust these versions/addresses from memory. At M1, the **Curator** persona confirms
> each via context7 / solana-dev MCP / official docs and records the verified value + source URL
> in `skill/resources.md`. Anything unverifiable is cut, not guessed.

| Concern | Default we teach | Verify |
|--------|------------------|--------|
| Core SDK | `@solana/kit` (the web3.js successor) | context7 |
| Payments protocol | Solana Pay (transfer + transaction requests) | official spec |
| Stablecoin rails | USDC, USDG, PYUSD — mint addrs + decimals | on-chain / issuer docs |
| Webhooks/indexing | Helius webhooks + DAS | Helius MCP/docs |
| Multisig/treasury | Squads | Squads docs |
| Local testing | Surfpool mainnet-fork + LiteSVM/Mollusk | kit MCP |
| Frontend | Next.js + `@solana/kit` + wallet adapter | context7 |

## Repo file tree (the deliverable)

```
solana-payments-skill/
├── README.md                     # overview, install, skills table, stack defaults, usage
├── LICENSE                       # MIT
├── install.sh                    # minimal: defaults to ~/.claude/skills/, installs all
├── install-custom.sh             # interactive: personal/project/custom location
├── skill/
│   ├── SKILL.md                  # HUB: frontmatter + one-primary-per-task routing table
│   ├── rails.md                  # stablecoin selection: USDC/USDG/PYUSD, mints, decimals, ATAs
│   ├── solana-pay.md             # transfer & transaction requests, QR, payment links, references
│   ├── checkout.md               # web checkout flow end-to-end (Next.js); never trust client amount
│   ├── subscriptions.md          # recurring: delegate/approve model + off-chain scheduler
│   ├── confirmation.md           # commitment levels, finality, idempotency keys, double-pay, retries
│   ├── reconciliation.md         # Helius webhook → ledger, exactly-once, replay/backfill, drift checks
│   ├── refunds-disputes.md       # refunds (full/partial), dispute handling, audit trail
│   ├── onramp-offramp.md         # fiat in/out providers, settlement, KYC hand-off
│   ├── compliance.md             # sanctions screening hook, record-keeping, travel-rule pointer
│   ├── treasury.md               # sweeping, Squads multisig, settlement, stablecoin FX
│   ├── testing.md                # devnet + mainnet-fork, simulating payers, assertion patterns
│   └── resources.md              # verified SDK/provider links + the version/address table
├── agents/                       # OPTIONAL (Fit bonus, not required)
│   ├── payments-engineer.md      # owns checkout/confirmation/reconciliation implementation
│   └── compliance-reviewer.md    # adversarial: double-pay, replay, sanctions, key handling
├── commands/                     # OPTIONAL
│   ├── scaffold-checkout.md      # /scaffold-checkout → working devnet checkout
│   └── reconcile.md              # /reconcile → wire webhook→ledger reconciliation
└── rules/
    └── payments.md               # auto-loading SAFETY LAWS (the heart — see below)
```

## `skill/SKILL.md` routing skeleton (to fill at build)

```markdown
---
name: solana-payments
description: Production-grade stablecoin payments for Solana — checkout, subscriptions, safe
  confirmation, webhook reconciliation, refunds, on/off-ramp, treasury, and compliance basics.
  Routes to focused references. Progressive disclosure.
user-invocable: true
license: MIT
---

# Solana Payments — Skill Hub

Precedence: `rules/payments.md` (safety laws) > official protocol/provider docs > this skill's guidance.

## Route (one primary per task)

| If the builder is trying to… | Primary reference |
|------------------------------|-------------------|
| Pick a stablecoin / set up mints & ATAs | `rails.md` |
| Build a QR/link checkout (Solana Pay)    | `solana-pay.md` → `checkout.md` |
| Charge recurring / subscriptions          | `subscriptions.md` |
| Know "did I really get paid?"             | `confirmation.md` |
| Match on-chain payments to my DB          | `reconciliation.md` |
| Refund or handle a dispute                | `refunds-disputes.md` |
| Move money to/from fiat                    | `onramp-offramp.md` |
| Screen/record for compliance              | `compliance.md` (legal layer → crypto-legal skill) |
| Hold/settle funds safely                   | `treasury.md` |
| Test any of the above                      | `testing.md` |

Program-level / on-chain custom logic → delegate up to `solana-dev` core skill.
NFT/token mechanics → `metaplex` / token skills. Trading/LP → out of scope.
```

## `rules/payments.md` — the safety laws (skeleton)

These are the invariants that make this skill *trustworthy*. They auto-load whenever payment code
is touched. Draft set (owner/Sentinel to finalize — see learning-mode request in chat):

1. Never trust a client-supplied amount, recipient, or mint — derive/verify server-side.
2. A payment is "received" only at the required commitment + verified amount/mint/recipient/reference.
3. Every charge carries an idempotency key; reconciliation is exactly-once and replay-safe.
4. Never log, embed, or transmit a secret key; examples use env + signer abstractions only.
5. Confirm the SPL **mint** and **decimals**, not just the symbol — symbols are not unique.

## Milestones

- **M0 — GO** (now): owner confirms topic + the 3 open decisions in `00-BRIEF.md`.
- **M1 — Skeleton + verification:** repo scaffold, MIT, installers, `SKILL.md` hub, `rules/payments.md`;
  Curator verifies stack table (versions/mints) → `resources.md`. *Gate: every fact has a source.*
- **M2 — Core flows:** `rails`, `solana-pay`, `checkout`, `confirmation`, `reconciliation` written +
  each carries a tested devnet/mainnet-fork snippet. *Gate: a checkout works end-to-end.*
- **M3 — Edge + cross-domain:** `subscriptions`, `refunds-disputes`, `onramp-offramp`, `compliance`,
  `treasury`, `testing`. *Gate: Sentinel adversarial pass clean.*
- **M4 — Polish + Fit:** README, optional `agents/`+`commands/`, install paths tested, Arbiter
  scores all rubric dims ≥ threshold. *Gate: "99% ready" (see `04-CRITIQUE-LOOP.md`).*

## Definition of Done (submission-ready)

- [ ] Mirrors `solana-game-skill` structure; `SKILL.md` frontmatter + routing valid.
- [ ] Every `.md` is progressive (loads only when its task is hit) and token-lean.
- [ ] Every code path is **runnable and tested** on devnet or mainnet-fork; no pseudo-code claims.
- [ ] Every external fact has a 2026 source recorded in `resources.md`.
- [ ] `rules/payments.md` safety laws present and referenced by the relevant `.md` files.
- [ ] No opaque executables / `curl|bash` of unpinned binaries anywhere.
- [ ] MIT `LICENSE`; README has problem statement, install one-liner, skills table, usage examples.
- [ ] Clean cross-skill hand-offs (legal → crypto-legal; on-chain → solana-dev).
- [ ] `install.sh` and `install-custom.sh` both verified on a clean machine.
