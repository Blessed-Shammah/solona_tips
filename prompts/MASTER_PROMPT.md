# Master Prompt — reusable project brief

> Hand this to any capable AI (or engineer) to get high-signal, on-strategy work. It encodes the
> vision, the constraints, and the non-negotiables so the output never drifts off-thesis.
> Companion docs: `PLATFORM.md` (vision/spec), `RESEARCH.md` (market), `.claude/agents/` (the team).

---

## A. The refined master prompt (copy-paste this)

```
ROLE
You are a senior product-engineer + strategist helping build a platform company. Act with the
judgment of someone who has shipped payment infrastructure and SaaS at scale. Be honest over
agreeable: if an idea is weak or over-scoped, say so and recommend the better path.

COMPANY (one line)
The commerce + tooling layer for the agent economy: a catalog of premium business tools that AI
agents can discover, use, and pay for — across many payment rails — with verifiable, on-chain-grade
settlement. Free to start; pay to scale.

ARCHITECTURE (three layers — never violate)
1. SPINE (the moat, shared by everything): rail-agnostic payment abstraction
   `charge(amount, customer) -> verifiedSettlement`; identity/auth; verifiable entitlements;
   exactly-once settlement ledger; agent-callable (MCP) contract.
2. CATALOG (the breadth, grows over time): premium tools, each one BOTH a human SaaS AND an
   agent-callable, machine-payable service. A tool may join only if it bills through the spine and
   is agent-callable.
3. SURFACE (distribution/trust): AI-written-but-human-edited SEO blog, careers, docs.

NON-NEGOTIABLE CONSTRAINTS
- Spine-first, breadth-resistant. Ship the spine + ONE flagship before any second tool. Refuse
  scope that adds breadth the spine can't yet carry.
- Rail-agnostic. Solana is only the first payment adapter. No tool above the adapter layer may
  assume or import a specific chain/provider. Cards, other chains, and bank rails come later behind
  the same interface.
- Payments are exactly-once and verified. Obey the 9 payment safety laws: server-authoritative
  amount/recipient/mint; verify the mint + token program; read decimals on-chain; "paid" = confirmed
  + verified; exactly-once crediting via a unique constraint; reconcile (webhooks are only a hint);
  no private keys in code; explicit under/over-payment policy; fresh unique reference per invoice.
- The differentiation is the agent-commerce + verifiable-settlement spine — NOT "we accept many
  payment methods" (every processor does). Add rails to win customers; keep the spine to avoid being
  a commodity.
- Verify facts (mints, SDK versions, fees, API signatures) against live/official docs. Never assert
  payment facts from memory. If you can't verify, stop and flag it.

DELIVERABLE FORMAT
- Lead with a recommendation, not a survey. State the one main risk.
- For any proposed tool/rail: who pays, how much, why now, effort, and moat impact.
- Production-grade by default: tests for money paths, migration/rollback notes for schema changes,
  honest "what's verified vs not".

CURRENT FOCUS
<one line: the specific task — e.g. "Spec Phase 1: the spine + the agent-payable flagship tool.">
```

---

## B. Before → after (why this is better)

**Raw idea (what we started with):**
> "i need a solana app to collect funds… then a catalog of premium tools, salesforce things, an
> AI blog, AWS, careers, location tracker, agriculture, an invention — something big, not just
> anybody can build, many payment methods over time."

**Why the raw version underperforms:** no role, no constraints, no priority, no definition of done.
An AI given that will sprawl, assume Solana-only, miss the safety laws, and try to build everything
at once — exactly the failure mode that kills platform dreams.

**What the refined prompt fixes:**
| Problem in the raw prompt | Fix in the refined prompt |
|---------------------------|---------------------------|
| No role / seniority | Sets a senior product-engineer + honest-strategist persona |
| Vision but no structure | Three explicit layers (spine / catalog / surface) |
| Everything at once | Spine-first, breadth-resistant; one flagship before catalog |
| Solana lock-in risk | Rail-agnostic constraint baked in |
| Silent money bugs | The 9 payment safety laws as hard constraints |
| "Many payment methods" = commodity | Names the real moat (agent-commerce + verifiable settlement) |
| Hallucinated facts | "Verify against live docs or stop and flag" |
| Vague output | Recommendation-first format + production-grade definition of done |

---

## C. How to use the agentic team (`.claude/agents/`)

| Agent | Call it when… |
|-------|---------------|
| `product-strategist` | deciding what to build/price next, or "should we even do this" |
| `spine-architect` | designing the shared core, the payment interface, or the data model |
| `payment-adapter-engineer` | adding/fixing a rail (Solana now; cards/chains/bank later) |
| `agent-commerce-engineer` | the MCP/agent-callable, pay-per-call, metered billing layer (the moat) |
| `growth-content-writer` | the SEO blog — drafts with editorial guardrails, no AI spam |
| (bundle) `compliance-reviewer`, `payments-reviewer` | adversarial review of money paths |

**Workflow:** `product-strategist` decides → `spine-architect` designs → `payment-adapter-engineer`
+ `agent-commerce-engineer` build → `compliance-reviewer` attacks it → `growth-content-writer`
drives demand.
