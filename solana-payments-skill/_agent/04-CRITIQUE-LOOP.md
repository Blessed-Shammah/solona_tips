# 04 — Critique Loop & "99% Ready" Gate

The mechanism that turns a draft into a submission: **draft → attack → score → reprompt → revise →
rescore**, run every milestone, never grading its own author.

## The rubric (aligned 1:1 with the bounty's judging axes)

| Dim | Weight | 0 | 3 | 5 |
|-----|:-----:|---|---|---|
| **Usefulness** | 30% | toy/demo | covers common payment tasks | a builder reaches for it weekly; every flow ends runnable |
| **Novelty** | 25% | duplicates existing skills | new framing of known parts | solves something (subscriptions, exactly-once reconciliation) nobody packaged |
| **Quality** | 30% | unsourced, untested prose | mostly correct, some tests | every fact sourced (2026), every path tested, safety laws enforced, red-team clean |
| **Fit** | 15% | wrong shape | close to kit shape | drops straight into the kit; perfect SKILL.md routing + progressive loading + MIT |

**Gate to advance a milestone:** no open *critical* (a Quality/Fit defect or a Sentinel-found
exploit). **"99% ready":** weighted score ≥ 4.5/5 **and** every Definition-of-Done box in
`01-PLAN.md` checked **and** Sentinel + Curator sign-offs clean. Maestro alone declares it.

## The reprompt protocol

1. Author role produces the artifact.
2. **Sentinel** attacks it (exploit list).
3. **Arbiter** scores each dim + emits a **gap list**: `{dim, score, specific gap, single fix}`.
4. **Maestro** reprompts *only the responsible role* with *only the gaps* (not the whole task —
   keeps revisions surgical and token-lean).
5. Revise → Arbiter rescores the changed dims only. Loop until gate green.

> Why "only the gaps": re-feeding the full task invites a full rewrite and drift. Feeding just the
> delta is how the loop converges instead of oscillating.

---

## Worked first pass — critiquing THIS package (before any code)

Running the loop against the plan itself, so we enter M1 already hardened. *(Arbiter speaking,
Sentinel cited.)*

**Score of the plan as first drafted:** Usefulness 4 · Novelty 4 · Quality 3 · Fit 4 → ~3.7.
Below the 4.5 gate. Gaps found and the fixes already folded back into `00`/`01`:

1. **[Quality, critical] Stale-fact risk.** First draft asserted SDK versions and mint addresses
   from memory — exactly the failure mode that makes a payments skill dangerous.
   → *Fixed:* `01-PLAN.md` now forces Curator to verify every version/mint/decimal against a 2026
   source and record it in `resources.md`; "unverifiable → cut" is a hard rule in the master prompt.

2. **[Novelty, important] "Payments skill" could read as a Solana Pay docs rehash.** The novel,
   defensible parts are **subscriptions** (no native primitive) and **exactly-once reconciliation**.
   → *Fixed:* both elevated to headline flows with their own gate (M2/M3) and named in the pitch.

3. **[Fit, important] Scope creep toward "product".** Risk of drifting into building a hosted
   processor. → *Fixed:* `00-BRIEF.md` Non-goals pins it to a *skill* (knowledge + safe scaffolds),
   no custody, no opaque binaries.

4. **[Quality, important] Author-grades-author.** A single agent would rate its own prose highly.
   → *Fixed:* `02-PERSONAS.md` separates Vega/Ledger (author) from Sentinel/Arbiter (attack/judge);
   the loop forbids self-grading.

5. **[Usefulness, minor] Compliance could bloat or wander into legal advice.** → *Fixed:* `compliance.md`
   capped at an engineering layer (screening hook + record-keeping) with a clean hand-off to the
   `crypto-legal` seed skill — which doubles as a cross-domain Fit bonus.

**Re-score after folding fixes:** Usefulness 4.5 · Novelty 4.5 · Quality 4.5 · Fit 4.5 → **4.5**.
Plan clears the gate. Remaining risk is all *execution* (does the verified, tested code actually
materialize in M1–M4), which is what the milestone gates exist to catch.

**Reasons a judge might still pass on us (watch-list for M4):**
- If any snippet is untested → instant Quality hit. (Mitigation: M2/M3 gates require a passing test.)
- If subscriptions resolve to "just call transfer on a cron" with no delegate/authorization story →
  Novelty collapses. (Mitigation: Vega must justify the model + state Solana's missing primitive.)
- If install paths aren't tested on a clean machine → Fit hit. (Mitigation: DoD + M4 Curator pass.)
