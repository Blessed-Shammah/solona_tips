# compliance.md — the engineering minimum

**Goal:** the *engineering* controls a payments system should have — screening hooks, record-keeping,
auditability. **This is not legal advice.** Entity setup, licensing, jurisdiction, and KYC *policy*
belong to the `crypto-legal` skill and real counsel. This file keeps a thin, honest engineering
layer and hands the rest off cleanly.

## Scope line (important)

- ✅ **In scope (engineering):** sanctions/wallet screening hook, immutable payment records, audit
  trail, data retention mechanics, configurable policy enforcement points.
- ➡️ **Out of scope (legal):** whether *you* need an MTL/EMI/VASP registration, which jurisdictions
  you may serve, your KYC thresholds, tax treatment → **`crypto-legal` skill** + counsel.

## Screening hook (build the seam, plug a provider in)

Put a single policy checkpoint in front of crediting and payout, so a screening provider can be
added without touching payment logic:

```ts
// one seam, called before crediting an inbound payment and before any outbound transfer
async function screen(addr: string, ctx: "inbound" | "payout"): Promise<"allow" | "block" | "review"> {
  // delegate to your configured screening provider; default-deny on provider error for payouts.
  return provider.check(addr, ctx);
}
```

- **Default-deny on uncertainty for outbound/off-ramp** (sending to a sanctioned address is the
  costly mistake); inbound can be `review`-and-hold rather than hard-block, per policy.
- Keep the provider behind config — don't hardcode one. The *seam* is the deliverable.

## Record-keeping (you'll be glad later)

Persist, immutably, for every payment and refund:
- invoice id, on-chain signature(s), payer & merchant addresses, mint, amount, timestamps,
  commitment level at which you credited, screening result.
- Make records **append-only** (no silent edits); corrections are new rows referencing the old.

This trail is what makes disputes (`refunds-disputes.md`), audits, and drift detection
(`reconciliation.md`) possible — and it's the evidence base any legal/compliance review will ask for.

## Travel rule & thresholds (pointer, not policy)

Above certain amounts, some jurisdictions require originator/beneficiary info exchange. **Whether,
when, and how** this applies to you is a legal determination → `crypto-legal` skill. Engineering-wise:
build the system so you *can* capture and attach that data if required (don't design it out).

## Privacy

Minimize stored PII; encrypt at rest; scope access. On-chain data is public and permanent — never
write personal data on-chain.

`★ Honest framing:` shipping a screening *seam* + clean records is responsible engineering and a
differentiator. Claiming the skill makes anyone "compliant" would be false — compliance is a legal
posture. Build the hooks, defer the judgments → `crypto-legal`.
