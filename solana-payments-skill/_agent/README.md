# Agentic Delivery Package — `solana-payments-skill`

This `_agent/` folder is the **build kit for the build kit**: everything an AI agent (or a
human + AI pair) needs to take this skill from empty repo → bounty-ready submission, the
agentic way — defined personas, an orchestration prompt, and a self-critique loop.

> Building target: a new skill for the **Solana AI Kit** bounty
> (3,000 USDG / 10 winners). Repo: https://github.com/solanabr/solana-ai-kit
> Reference shape: https://github.com/solanabr/solana-game-skill

## Read order

| # | File | What it gives you |
|---|------|-------------------|
| 0 | [`00-BRIEF.md`](00-BRIEF.md) | The bounty, the gap, the chosen skill, how we win each judging axis. **Start here.** |
| 1 | [`01-PLAN.md`](01-PLAN.md) | Target stack, repo file tree, per-file spec, SKILL.md routing skeleton, milestones, Definition of Done. |
| 2 | [`02-PERSONAS.md`](02-PERSONAS.md) | The 7-agent developer team — mandates, hand-off contracts, and how they map to the kit's real agents. |
| 3 | [`03-ORCHESTRATION.md`](03-ORCHESTRATION.md) | The "arranged prompt" — a paste-ready master prompt + per-persona prompt templates + the build sequence. |
| 4 | [`04-CRITIQUE-LOOP.md`](04-CRITIQUE-LOOP.md) | The judging-aligned rubric, the reprompt protocol, the "99% ready" gate, and a worked first critique pass. |
| — | [`../AGENTS.md`](../AGENTS.md) | The collaboration guide another LLM reads first when it joins the repo. Lives at repo root by convention. |

## Status

- [x] Kit + reference skill studied (format, routing, install, judging criteria)
- [x] Topic chosen + gap validated → `solana-payments-skill`
- [x] Agentic delivery package written (this folder)
- [x] First self-critique pass run (see `04-CRITIQUE-LOOP.md` §Worked Pass)
- [ ] **GO decision** from owner on topic + scope boundary (see `00-BRIEF.md` §Open Decisions)
- [ ] Build M0→M4 (see `01-PLAN.md`)

## The one rule that overrides everything

Payments code that is wrong loses money. Every claim, mint address, SDK call, and confirmation
semantic in this skill must be **verified against a live 2026 source at build time**
(context7 / solana-dev MCP / official docs) — never written from model memory. See `../AGENTS.md`.
