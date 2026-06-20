# onramp-offramp.md — fiat in and out

**Goal:** let users arrive with fiat (on-ramp) and let the business take fiat out (off-ramp),
without the skill pretending to be a licensed money transmitter. **You integrate providers; you do
not become the bank.** Legal/licensing layer → `crypto-legal` skill.

## On-ramp (user pays card/bank → gets stablecoin)

Use a hosted on-ramp provider (they own KYC, card processing, fraud, licensing). Integration shape:

```
your app → open provider widget/session (amount, destination wallet, target = USDC/USDG/PYUSD)
provider → runs KYC + payment, delivers stablecoin to the user's (or your) wallet
your app → treat arrival like any inbound payment: confirm + reconcile (confirmation.md / reconciliation.md)
```

- Pass a `reference`/order id through if the provider supports it, so delivery reconciles to an order.
- Verify the **mint and amount actually delivered** on-chain — don't trust the provider callback alone.
- Settlement is **not instant**; design UX for "processing" states and provider webhooks.

## Off-ramp (business converts stablecoin → bank)

```
business treasury → off-ramp provider (KYB'd business account) → fiat to bank
```

- Off-ramps require **business KYB** and have payout windows, limits, and supported corridors —
  capture these as config, not assumptions.
- **Use `finalized` commitment** before sending funds to an off-ramp (irreversible outbound).
- Reconcile provider payout reports against your treasury outflows (drift detection, `treasury.md`).

## What this skill does and doesn't do

- ✅ Integrate a provider, reconcile delivered/withdrawn funds on-chain, handle pending states.
- ✅ Hand KYC/KYB and consumer protection to the provider.
- ❌ Custody other people's fiat, run your own KYC, or advise on MTL/EMI licensing → that's the
  `crypto-legal` skill + real counsel.

## Choosing a provider (evaluate at build time)

Compare on: supported countries/corridors, chains & mints (must support your rail on Solana),
fees, settlement speed, KYC friction, payout reliability, and webhook quality. Record the chosen
provider's specifics in your app config; this skill stays provider-agnostic.

→ Compliance controls you still own (screening, records): `compliance.md`.
