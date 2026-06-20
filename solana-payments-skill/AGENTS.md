# AGENTS.md — collaboration guide for AI agents

If you are an AI agent (Claude Code, Codex, Cursor, …) joining this repo, **read this first.**
This project builds `solana-payments-skill`, a submission to the Solana AI Kit bounty.

## What you're building

A **skill** for the Solana AI Kit: knowledge + safe scaffolds that turn a coding agent into a
stablecoin-payments expert. It is *not* a deployed product. It mirrors the shape of
`solanabr/solana-game-skill`. Judged on **Usefulness · Novelty · Quality · Fit**.

## Read order (do not skip)

1. `_agent/00-BRIEF.md` — the bounty, the gap, the chosen skill, how we win.
2. `_agent/01-PLAN.md` — stack, file tree, per-file spec, milestones, Definition of Done.
3. `_agent/02-PERSONAS.md` — the 7 roles you'll operate as.
4. `_agent/03-ORCHESTRATION.md` — the master prompt + per-role templates + build sequence.
5. `_agent/04-CRITIQUE-LOOP.md` — the rubric, the reprompt protocol, the "99% ready" gate.

Then boot with the **master prompt** in `03-ORCHESTRATION.md §A`.

## Non-negotiable guardrails

1. **Verify, don't recall.** Every SDK version, mint address, decimals, API signature, and
   confirmation semantic must be checked against a **live 2026 source** (context7 / solana-dev MCP /
   official docs) before you write it. Record the source in `skill/resources.md`. Unverifiable → cut.
   *Payments code that is wrong loses money — this rule is the whole reason the skill is trustworthy.*
2. **Test what you publish.** Every code path runs on devnet or mainnet-fork (Surfpool). No
   pseudo-code dressed up as working code.
3. **Obey `rules/payments.md`** (the safety laws) in every example.
4. **No secrets, no opaque binaries.** Never put a private key in an example. Never `curl|bash` an
   unpinned binary. MIT-license everything.
5. **Match the kit's shape.** `skill/SKILL.md` hub → one-primary-per-task routing → progressive
   `.md` files that load only when their task is hit. Keep each file token-lean.
6. **Don't grade your own work.** Author as Vega/Ledger/Scribe; attack as Sentinel; score as
   Arbiter. Maestro advances milestones. Self-congratulation is a bug.

## How to work

- Operate **milestone by milestone** (M0→M4). After each, run the critique loop in
  `04-CRITIQUE-LOOP.md` until the gate is green; never advance with an open critical.
- Use the **hand-off format** (`03-ORCHESTRATION.md §D`) when passing work between roles or sessions,
  so the next agent has decisions, sources, and open questions in one block.
- **Cross-skill hand-offs:** legal layer → `crypto-legal` seed skill; custom on-chain programs →
  `solana-dev` core; NFT/token mechanics → `metaplex`/token skills; trading/LP → out of scope.
- **Ask the human only** for the Open Decisions in `00-BRIEF.md` (topic confirm, compliance depth,
  subscription model). Everything else: decide, record the decision, and move.

## Definition of Done

The checklist in `01-PLAN.md §Definition of Done` is the contract. "99% ready" = weighted rubric
≥ 4.5, all DoD boxes checked, Sentinel + Curator sign-offs clean. Only Maestro declares it.

## Repo conventions

- `_agent/` = how we build (this planning package). `skill/`, `agents/`, `commands/`, `rules/` =
  the deliverable. `README.md` + `LICENSE` = what graders see first.
- Keep `_agent/` out of the final skill's token footprint — it's scaffolding, not shipped context.
- One fact, one source, recorded once in `resources.md`; reference it elsewhere, don't restate.
