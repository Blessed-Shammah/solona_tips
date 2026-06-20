# Solana Payments Skill

> Production-grade **stablecoin payments** for Solana builders — a skill for the
> [Solana AI Kit](https://github.com/solanabr/solana-ai-kit). Turns any coding agent into a
> payments engineer: checkout, subscriptions, safe confirmation, webhook→ledger reconciliation,
> refunds, on/off-ramp, treasury, and the compliance minimum.

## The problem it solves

Every founder building commerce, SaaS, billing, or fintech on Solana hits the same wall: *accept a
stablecoin and **know, reliably**, that you got paid — once, for the right amount, in the right
token.* That knowledge is scattered across the Solana Pay spec, Helius webhook docs, and tribal
lore about finality and idempotency. This skill packages it end-to-end, with the safety invariants
that keep a payments bug from silently moving money.

It is the first skill in the ecosystem dedicated to **payments + reconciliation** (the existing
in-game `payments.md` covers game economies only).

## What's included

| Reference | Covers |
|-----------|--------|
| `rails.md` | Choosing USDC / USDG / PYUSD; mints, decimals, SPL vs Token-2022, ATAs |
| `solana-pay.md` | Transfer & transaction requests, QR, payment links, the `reference` key |
| `checkout.md` | End-to-end web checkout (server creates request, client pays, server verifies) |
| `confirmation.md` | Commitment levels, finality, idempotency, double-pay, retries |
| `reconciliation.md` | Helius webhook → ledger, exactly-once, replay/backfill, drift detection |
| `subscriptions.md` | Recurring via delegate/approval + off-chain scheduler (no native primitive) |
| `refunds-disputes.md` | Full/partial refunds, dispute handling, audit trail |
| `onramp-offramp.md` | Fiat in/out, settlement timing, KYC hand-off |
| `compliance.md` | Sanctions screening hook, record-keeping (legal layer → `crypto-legal` skill) |
| `treasury.md` | Sweeping, Squads multisig, settlement, stablecoin handling |
| `testing.md` | Devnet + mainnet-fork, simulating payers, assertion patterns |
| `myths.md` | 5 payment myths that cause real losses, debunked |
| `resources.md` | Verified mints, SDKs, specs + their sources |
| `rules/payments.md` | Auto-loading **safety laws** (the heart of the skill) |

Focused references live in `skill/references/` (loaded on demand); `skill/SKILL.md` is the routing
hub. Run it as a slash command: `/solana-payments`.

Optional `agents/` (payments-engineer, compliance-reviewer) and `commands/`
(`/scaffold-checkout`, `/reconcile`).

## Installation

```bash
# Minimal — installs to ~/.claude/skills/
git clone https://github.com/Blessed-Shammah/solana-payments && cd solana-payments && ./install.sh

# Interactive — choose personal / project / custom location
./install-custom.sh
```

| | `install.sh` | `install-custom.sh` |
|--|--|--|
| Prompts | Minimal | Full menu |
| Location | `~/.claude/skills/` | Personal / project / custom |
| Best for | Automation | Manual setup |

## Default stack (June 2026 — see `skill/resources.md` for sources)

- **SDK:** `@solana/kit` (`createSolanaRpc`), `@solana-program/token` + `@solana-program/token-2022`
- **Payments:** Solana Pay (transfer + transaction requests)
- **Rails:** USDC (SPL), USDG (SPL), PYUSD (Token-2022)
- **Webhooks/index:** Helius webhooks + Enhanced Transactions
- **Treasury:** Squads multisig
- **Testing:** Surfpool mainnet-fork + LiteSVM/Mollusk

## Usage examples

```
"Add a USDC checkout to my Next.js app"        → solana-pay.md → checkout.md → confirmation.md
"How do I know the payment actually settled?"  → confirmation.md → reconciliation.md
"Let users subscribe for $10/mo in USDG"       → subscriptions.md
"My webhook fired twice — did I double-charge?" → reconciliation.md (idempotency + exactly-once)
"Refund order #4821"                            → refunds-disputes.md
```

## Repository structure

```
skill/
  SKILL.md          routing hub (frontmatter + one-primary-per-task table)
  references/       focused single-topic files, loaded on demand
rules/              payments.md — safety laws, auto-loaded on payment code
agents/             payments-engineer, compliance-reviewer, payments-reviewer
commands/           /scaffold-checkout, /reconcile
examples/           payments-core — runnable safety tests (node --test, 9/9 passing)
.github/workflows/  ci.yml — tests + integrity guards on every push
_agent/             how this skill was built (planning + review package — not shipped context)
```

## Development workflow

- **Verify, don't recall.** Every mint/SDK/API fact is checked against a live source and recorded in
  `resources.md`. Unverifiable facts are cut, not guessed.
- **Obey the safety laws** in `rules/payments.md` in every example.
- **Test before trust** — see `testing.md`; no code path ships as "working" without a devnet or
  mainnet-fork test.

## Related

- [Solana AI Kit](https://github.com/solanabr/solana-ai-kit) · [Reference: solana-game-skill](https://github.com/solanabr/solana-game-skill)
- Hand-offs: `solana-dev` (programs), `metaplex` (NFT/token), `crypto-legal` (legal layer)

## Contributing

PRs welcome. Keep references progressive and token-lean, every fact sourced, every code path tested.
See `_agent/` for the personas, orchestration prompt, and critique loop used to build this.

## License

MIT — see [LICENSE](LICENSE).
