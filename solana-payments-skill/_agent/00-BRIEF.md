# 00 — Project Brief

## The bounty (verbatim essentials)

- **Who:** Solana AI Kit (solanabr) — a Claude Code / Codex config that turns a coding agent
  into an expert Solana builder via progressively-loaded skills.
- **Ask:** Build & submit a **new Solana skill** that solves a real, recurring problem for
  builders — ideally a genuine gap nobody has properly solved.
- **Two paths:** (a) PR-improve one of three *seed* skills, or (b) **ship your own repo.**
- **Reward:** 3,000 USDG across 10 winners (1st–5th: 400 each; 6th–10th: 200 each).
- **Judging:** **Usefulness · Novelty · Quality · Fit.**
- **Submit:** public GitHub repo/PR + README + a comprehensive `SKILL.md` following the kit's
  structure + questionnaire on the listing. MIT-licensed, merge/submodule-ready.
- **Contact:** @kauenet.

## Path decision: ship our own (not a seed PR)

The three seeds (`crypto-legal`, `position-manager`, `solana-auditor`) are pre-scoped, so they
will attract a crowd of overlapping PRs judged purely on execution. Shipping our own skill banks
the **Novelty** axis from the start and avoids a merge dogfight. → **Path (b).**

## The chosen skill

> **`solana-payments-skill`** — *Production-grade stablecoin payments for Solana builders.*
> Solana Pay checkout & payment links, subscriptions/recurring (no native Solana primitive),
> safe confirmation + idempotency, webhook→ledger reconciliation, refunds/disputes, on/off-ramp,
> treasury settlement, and the compliance minimum (sanctions screening, record-keeping).

### The gap (why this wins on Novelty)

Every founder building commerce, SaaS, billing, marketplaces, or fintech on Solana hits the same
wall: *accept a stablecoin and know, reliably, that you got paid.* Today that knowledge is
scattered across Solana Pay docs, Helius webhook docs, ad-hoc SDK snippets, and tribal knowledge
about finality and idempotency. The kit's existing `payments.md` (in `solana-game-skill`) only
covers **in-game economies**. There is **no** end-to-end payments/checkout/reconciliation skill in
the ecosystem. This is the densest unsolved cross-domain need on Solana right now.

### One-line pitch (for README + submission)

*"The skill a coding agent loads the moment a founder says 'let users pay me in USDC' — from
checkout to confirmed, reconciled, refundable, compliant settlement."*

## How we win each judging axis

| Axis | Our move |
|------|----------|
| **Usefulness** | Targets the most common monetization task on Solana; every flow ends in a *working, tested* path (devnet + mainnet-fork), not prose. Recurring need → high reach-for rate. |
| **Novelty** | First dedicated payments/reconciliation skill. Subscriptions + exactly-once reconciliation are real unsolved problems, not a docs rehash. |
| **Quality** | Every fact verified against a live 2026 source at build time; safety invariants encoded in `rules/payments.md`; adversarial security/compliance review pass before "done". |
| **Fit** | Mirrors `solana-game-skill` exactly: `skill/SKILL.md` hub → focused `.md` routing, optional `agents/`/`commands/`/`rules/`, `install.sh` + `install-custom.sh`, MIT, submodule-ready. |

## Non-goals (scope guardrails)

- **Not** a hosted payment processor or a deployed service — it's a *skill* (knowledge + safe
  scaffolds an agent loads), not a product we operate.
- **No** custody of user funds, no private keys in examples, no `curl | bash` of opaque binaries.
- **No** legal advice — `compliance.md` gives engineering-level controls and points to the
  `crypto-legal` seed skill for the legal layer (clean cross-skill hand-off = a Fit bonus).
- **Not** a price-oracle / trading / LP skill — that's `position-manager` territory.

## Open decisions (need owner GO before M1)

1. **Topic confirm:** payments skill as scoped above — yes / redirect?
2. **Compliance depth:** ship the engineering-grade `compliance.md` (sanctions screening hook +
   record-keeping + travel-rule pointer), or cut it to stay pure-dev and hand *all* compliance to
   the legal seed skill? (Recommended: keep a thin engineering layer — it's a Novelty + cross-domain
   multiplier and a key differentiator.)
3. **Subscription model:** Solana has no native recurring charge. Pick the default we teach as
   primary (see `01-PLAN.md` §Subscriptions). Owner judgment shapes the headline flow.
