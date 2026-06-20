# treasury.md — holding & settling funds

**Goal:** where received stablecoins live, how they move, and how to not lose them to a single
leaked key. Obeys Safety Law #7 (no bare keys).

## Account topology

```
merchantAta (hot, receives payments)
   │  sweep above a float threshold
   ▼
treasury multisig (Squads)  — bulk of funds, M-of-N signers
   │  scheduled / approved
   ▼
off-ramp provider  (finalized only)  → bank
```

- **Hot receiving account** holds only a working float. Compromise of its signer caps the loss.
- **Treasury multisig (Squads)** holds the rest. Large refunds/payouts require M-of-N approval —
  no single key moves serious money.

## Sweeping

A scheduled job moves balance above a float from the hot account into the multisig:

```ts
// sweep when hot balance exceeds the float; keep enough to fund refunds + fees
if (hotBalance > floatTarget) {
  const amount = hotBalance - floatTarget;
  // transferChecked(hotAta → treasuryAta, amount); confirm at 'confirmed'; record the sweep.
}
```

Keep float ≥ expected refunds + transaction fees so you're never stuck unable to refund.

## Signing & key handling

- Hot signer: environment-injected, least-privilege, rotatable, behind a signer interface.
- Treasury: hardware/multisig signers (Squads); approvals logged.
- **Never** put any secret key in code, env files committed to git, logs, or error messages.

## Settlement & FX

- Settling stablecoin→fiat: use `finalized` commitment before sending to off-ramp (irreversible).
- Holding multiple stablecoins (USDC/USDG/PYUSD): track balances per mint; if you consolidate to one
  rail, that conversion is a swap — out of this skill's scope (don't bolt trading logic into
  payments; hand to a swap/DeFi skill).

## Reconciling the treasury

Periodically reconcile: `Σ credited payments − Σ refunds − Σ swept ≟ on-chain balances`. A mismatch
is a missed/duplicated payment or an unrecorded movement → alert (ties to `reconciliation.md` drift
detection). Treasury truth must equal on-chain truth.

→ Large refunds route through the multisig here from `refunds-disputes.md`; outbound to fiat in
`onramp-offramp.md`.
