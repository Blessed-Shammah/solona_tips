# REVIEW-01 — PhD reviewer pass (payments-reviewer)

Date: 2026-06-19. Reviewer: `agents/payments-reviewer.md`. Inputs: the repo, the owner's strategy
doc (*Strategic Blueprint for the Solana AI Kit Skill Bounty*), and live web research on Solana
payment pitfalls. Judged on Usefulness · Novelty · Quality · Fit.

## Findings & corrections (all applied)

| # | Sev | File(s) | Discrepancy | Fix | Source |
|---|-----|---------|-------------|-----|--------|
| 1 | High (Fit) | `skill/*` | Flat `skill/*.md`; the kit routes to `skill/references/…` | Moved 12 references into `skill/references/`; updated SKILL.md routing + CI + README + installer (copy is recursive, no change needed) | strategy doc §Required Repo Architecture; kit SKILL.md routing |
| 2 | High (Fit) | `skill/SKILL.md` | No `argument-hint`; description lacked explicit trigger phrases | Added `argument-hint` (registers `/solana-payments`); rewrote description with trigger phrases | strategy doc §SKILL.md Hub |
| 3 | High (Fit) | `install.sh` | No `--agents` flag for non-Claude envs | Added `--agents` (installs a Cursor/Windsurf/Codex copy under `./.agents/`) + `--help` | strategy doc §Phase 1 |
| 4 | High (Quality) | `references/rails.md`, `confirmation.md`, `myths.md` | Token-2022 **transfer fee** ignored → "received == requested" assumption misflags valid payments | Added transfer-fee handling; expected amount net-of-fee; verify by balance delta | Token-2022 docs; myth #3 |
| 5 | Med (Quality) | `references/rails.md` | Token-2022 **transfer hook** (mandatory CPI, can fail) unaddressed | Added hook handling: budget CU, treat revert as not-paid, hand hook authoring to `solana-dev` | strategy doc §2026 stack; Colosseum "5 Boss Battles" |
| 6 | Med (Quality) | `references/confirmation.md`, `resources.md` | No 2026 finality context | Added Alpenglow (~150 ms) note — *without* dropping commitment discipline | strategy doc; helius commitment-levels |
| 7 | Med (Quality) | `references/confirmation.md`, `reconciliation.md`, `resources.md` | `@solana/pay` `validateTransfer` multi-transfer edge case not warned | Added caveat: verify the tx yourself; helper is not the authority | advisories.gitlab.com/pkg/npm/@solana/pay |
| 8 | Med (Usefulness) | `references/myths.md` (new) | No myth-busting layer | Added 5 research-grounded myths, each routed to its fix | web research; this doc |
| 9 | Low (Quality) | `resources.md` | `@solana/kit` version unspecified | Pinned to v5.x; noted legacy web3.js is the thing it replaces | strategy doc §2026 stack |
| 10 | — | `agents/payments-reviewer.md` (new) | No reusable review capability | Added PhD-level reviewer agent (this persona) | requested |

## Cross-checks the doc raised that we were already correct on

- Server-authoritative amount/recipient; never trust the client. ✓ (`checkout.md`, Law #1)
- Exactly-once crediting via DB unique constraint, not app logic. ✓ (`reconciliation.md`, Law #5)
- MIT license, dual installers, no opaque binaries. ✓
- LiteSVM/Mollusk + Surfpool mainnet-fork testing. ✓ (`testing.md`)

## Honest status after the pass

- **Source-verified:** mints (USDC/USDG/PYUSD), token programs, `@solana/kit`, Solana Pay
  `reference`→`getSignaturesForAddress`, the `@solana/pay` advisory, Token-2022 fee/hook existence.
- **Execution-verified:** the network-free safety properties (`examples/payments-core`, 9/9).
- **Still pending execution-verification:** on-chain paths on a mainnet-fork (real `transferChecked`,
  Token-2022 transfer-fee math against a live fee mint) — the commented CI integration job.
- **Treated cautiously, not overstated:** Alpenglow ~150 ms and Firedancer specifics are stated as
  context with the practical lesson kept commitment-level-agnostic.

## Re-score

| Axis | Before | After | Why moved |
|------|:-----:|:-----:|-----------|
| Usefulness | 4.7 | 4.8 | myths + transfer-fee reality catch real-world failures |
| Novelty | 4.6 | 4.7 | Token-2022 fee/hook + exactly-once reconciliation is uncommon depth |
| Quality | 4.5 | 4.7 | 2026-current, advisory-aware, sourced |
| Fit | 4.8 | 4.9 | references/ layout + argument-hint + `--agents` now match the kit exactly |

Weighted ≈ **4.77/5**. Remaining gap is execution-verification of the on-chain paths.
