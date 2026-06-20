# subscriptions.md — recurring payments

**Goal:** charge a user repeatedly. **Solana has no native recurring-charge primitive** — there is
no "auto-debit my account monthly" at the protocol level. You build it. This file picks one primary
pattern and names the trade-offs (a real, unsolved builder problem — the skill's novelty core).

## The three honest options

| Pattern | How | Pros | Cons |
|---------|-----|------|------|
| **A. Delegate / approval** (PRIMARY) | User `approve`s a delegate (your service signer or a small program) to move up to an allowance from their token account; an off-chain scheduler pulls each period | Non-custodial, user-revocable, predictable | User must trust/limit the allowance; delegate is off-chain trust unless programmatic |
| **B. Push invoicing** | Each period you generate a Solana Pay invoice and the user pays it | Zero standing authority; dead simple | High churn — user must act every cycle |
| **C. On-chain subscription program** | A custom Anchor program holds rules and a delegate PDA enforces caps/cadence | Trust-minimized, auditable cadence | You write + audit a program → hand to `solana-dev` |

**Default we teach: A**, with B as the no-standing-authority fallback and C as the trust-minimized
upgrade for high-value or regulated cases.

## Pattern A — delegate + scheduler

```
Setup (once, user signs):
  user → approve(delegate = serviceSigner, amount = perChargeCap or N periods)  on their token account

Each period (off-chain cron):
  scheduler → for each active sub due now:
    build transferChecked( from = userAta, to = merchantAta, authority = delegate, amount = price )
    sign with serviceSigner (the delegate) → submit → confirm (confirmation.md) → credit (reconciliation.md)
```

Safety rules specific to subscriptions:

1. **Cap the allowance.** Approve only what's needed (one charge, or N charges) — never unlimited.
   Re-approve on renewal. Unlimited approval is a footgun and a support nightmare.
2. **Pre-charge checks.** Before each pull: subscription still active? allowance ≥ price? balance ≥
   price? not already charged this period (idempotency key = `subId:periodStart`)?
3. **Revocation is the user's right.** A user can `revoke` the delegate any time → next pull fails
   cleanly → mark `past_due`, notify, retry/cancel per your dunning policy. Never treat revoke as
   an error to hide.
4. **Failed charge ≠ silent retry storm.** Use bounded dunning (e.g. retry day 1/3/5 then suspend).
5. **Same confirmation + reconciliation discipline as one-off payments** — a recurring charge is
   just a one-off charge with a schedule and an authority.

## Idempotency for periods

```ts
const idempotencyKey = `${subId}:${periodStart.toISOString()}`; // one charge per sub per period
```

This guarantees a scheduler that runs twice (cron overlap, restart) can't double-bill a period —
enforced by the same unique-constraint pattern as `reconciliation.md`.

## What to surface to the user

Clear cadence, amount, next charge date, current allowance, and a one-click revoke. Opaque
recurring charges on crypto rails destroy trust faster than anything.

→ Build the per-charge transfer like any payment (`solana-pay.md` / `confirmation.md`). For Pattern
C's on-chain program, hand off to the `solana-dev` skill.
