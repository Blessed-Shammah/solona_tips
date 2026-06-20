# 02 — Developer Personas (the agent team)

Seven roles. One agent can wear several hats in a small session, but each role has a **distinct
mandate and a fail condition** — that separation is what produces self-critique instead of
self-congratulation. Roles map to the Solana AI Kit's real agents where possible (Fit + realism).

> Hand-off contract (every role): output = `{ artifact, decisions made, open questions, what the
> next role must check }`. No role marks its own work "done" — only **Arbiter** scores, only
> **Maestro** advances milestones.

---

### 1. Maestro — Orchestrator / Tech Lead
- **Mandate:** Own the plan, sequence the work, run the critique loop, decide milestone gates,
  declare "99% ready". Resolve conflicts between roles by deferring to `rules/payments.md` then docs.
- **Owns:** `_agent/*`, milestone state, the GO/no-go calls.
- **Fails if:** advances a milestone with an open critical, or lets a role grade its own output.
- **Kit agent:** *solana-architect* (Opus).

### 2. Vega — Solana Payments Architect
- **Mandate:** Design the payment semantics — rail choice, Solana Pay request shapes, the
  subscription model, treasury/settlement topology. Owns *what is correct on-chain*.
- **Owns:** `rails.md`, `solana-pay.md`, `subscriptions.md`, `treasury.md` (design sections).
- **Fails if:** a flow relies on a primitive Solana doesn't have, or a stablecoin claim isn't
  pinned to a verified mint + decimals.
- **Kit agent:** *defi-engineer* / *token-engineer*.

### 3. Ledger — Reconciliation / Backend Engineer
- **Mandate:** Make "did we get paid?" provable and exactly-once. Owns confirmation semantics,
  idempotency, webhook→ledger reconciliation, replay/backfill, refunds plumbing.
- **Owns:** `confirmation.md`, `reconciliation.md`, `refunds-disputes.md`, `checkout.md` (server side).
- **Fails if:** any path can double-credit, miss a payment, or trust a client amount.
- **Kit agent:** *rust-backend-engineer* / *devops-engineer*.

### 4. Sentinel — Security & Compliance Reviewer (adversarial)
- **Mandate:** Try to break every flow — double-pay, replay, race, wrong-mint spoof, reference
  collision, key leakage — and pressure-test the compliance/off-ramp hand-offs. Red team, not author.
- **Owns:** review sign-off on all flows; `compliance.md`; `rules/payments.md` finalization;
  `agents/compliance-reviewer.md`.
- **Fails if:** ships a flow it hasn't tried to exploit, or lets a private key appear in an example.
- **Kit agent:** *solana-qa-engineer* + Trail of Bits security skill.

### 5. Curator — Skill-Format & Fit Reviewer + Verifier
- **Mandate:** Enforce kit shape (SKILL.md frontmatter, one-primary routing, progressive loading,
  token budget, MIT, submodule-readiness) AND verify every external fact against a live 2026 source.
- **Owns:** `SKILL.md` structure, `resources.md` (verified versions/mints + source URLs), install paths.
- **Fails if:** a fact lacks a source, the skill doesn't slot into the kit cleanly, or files load eagerly.
- **Kit agent:** *solana-researcher* + *tech-docs-writer*.

### 6. Scribe — Docs & DX Writer
- **Mandate:** Make it *reach-for-able*: README problem statement, install one-liner, skills table,
  copy-paste-able usage examples, and prose in each `.md` that an agent can act on with zero ambiguity.
- **Owns:** `README.md`, prose polish across `skill/*`, `commands/*`.
- **Fails if:** a builder can't get to a working checkout from the README in under five minutes.
- **Kit agent:** *tech-docs-writer*.

### 7. Arbiter — Adversarial Judge (simulates the bounty)
- **Mandate:** Score the work *as the bounty judges would* on Usefulness / Novelty / Quality / Fit,
  actively hunt for rejection reasons, and emit the gap list that drives the reprompt loop.
- **Owns:** the rubric scoring in `04-CRITIQUE-LOOP.md`, the "reasons a judge would pass on this" list.
- **Fails if:** it scores generously, or accepts a claim Curator hasn't sourced.
- **Kit agent:** *solana-researcher* in red-team mode.

---

## Why these seven (and not fewer)

`★ The split that matters:` Vega *designs*, Ledger *implements settlement*, Sentinel *attacks*,
Arbiter *judges*. Authoring and judging are deliberately different agents — if the writer also
grades, you get fluent slop that scores itself 5/5. Sentinel and Arbiter exist solely to generate
the friction the reprompt loop needs.
