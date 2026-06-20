# SolTip — Market & Startup Research

> Honest strategic analysis of turning this payment-link app into a business. Numbers are grounded
> in sources (linked at the bottom) and current as of mid-2026. Where something is a judgment call
> or a risk, it's labeled as such — this is a plan, not a pitch.

---

## 1. What it is, in one line

A **non-custodial payment-link / checkout layer for stablecoins on Solana**: a merchant creates a
link or QR, the customer pays in USDC/USDG/PYUSD/SOL, and funds land **directly in the merchant's
wallet** — the app only *proves* settlement on-chain (it never touches the money).

That "never touches the money" property is the strategic crux: it's the cheapest and least
regulated place to stand, and also the hardest to monetize directly. More on that tension below.

---

## 2. Why now — the market is real, not hypothetical

- **Stablecoin payment volume ≈ $400B in 2025**, roughly **doubling** year over year, per Stripe's
  2025 letter; ~60% is B2B. Chainalysis puts *adjusted* stablecoin volume near **$28T in 2025**.
- **Stripe acquired Bridge for $1.1B**; Bridge volume **quadrupled** in 2025. Stripe now turns on
  stablecoin acceptance **by default** in Checkout.
- **Shopify + Stripe** rolled out USDC acceptance to **millions of merchants across 34 countries**
  (on Coinbase's Base).
- On Solana specifically, **Helio (now MoonPay Commerce)** is the official Solana Pay solution for
  Shopify with **6,000+ merchants** and billions processed.
- Regulatory fog is clearing: US stablecoin legislation (the GENIUS Act framework) gives issuers
  like Circle a clearer footing, which de-risks *accepting* USDC for ordinary businesses.

**Takeaway:** the "should businesses accept stablecoins?" question is being answered *yes* by the
biggest players. That's validation — and also the competitive warning. You are not early to the
idea; you'd be competing on a specific wedge, not inventing a category.

---

## 3. Where this is actually useful (use cases)

Ranked by how well the non-custodial, link-first model fits:

| Use case | Why it fits | Notes |
|----------|-------------|-------|
| **Freelancers / creators / consultants** | Send an invoice link, get paid globally in minutes, no 2.9% cut, no chargebacks | Strongest wedge. People who currently use PayPal/Wise and hate the fees. |
| **Cross-border B2B invoices** | Settles in seconds vs. days; no FX spread; flat tiny network fee | B2B is 60% of stablecoin volume — follow the money. |
| **Tips / donations / creators** | A link in a bio or stream overlay; micropayments are viable at ~$0.0005 fees | "SolTip" literally fits here. |
| **Digital goods / SaaS / API access** | Pay-per-use, no card vault, instant confirm | Subscriptions need the delegate-approval pattern (skill covers it). |
| **Events / ticketing / POS QR** | Print a QR, customer scans, you see "Paid" live | Solana Mobile's launch used Helio and saved >$1M in fees vs. cards. |
| **Remittances / payroll in unstable-currency regions** | USDC as a dollar proxy where local rails are weak | High social value; KYC/compliance burden is higher. |
| **High-risk / chargeback-prone merchants** | Crypto is push-payment: no chargebacks at all | iGaming, etc. — lucrative but regulation-heavy. |

**Where it does *not* fit (be honest):** mainstream consumer retail where buyers expect cards +
buyer protection + refunds, and any context where the customer doesn't already hold crypto. The
"customer must have a funded Solana wallet" friction is the #1 adoption ceiling.

---

## 4. Is it a startup? — honest verdict

**Yes, but not as a standalone "payment link" tool.** A bare link generator is a feature, not a
company — Helio, Sphere, Stripe, and Coinbase Commerce already do the obvious version. The viable
startup is one of these *sharpened* wedges:

1. **Vertical focus** — "the USDC invoicing tool for freelancers/agencies" or "crypto POS for X
   industry." Win a niche the incumbents treat as generic.
2. **Cheaper + non-custodial by design** — undercut the 1–2% crypto incumbents because your funds
   flow peer-to-peer (you never custody, so you carry less cost and less regulatory weight).
3. **Developer infrastructure** — sell the *reconciliation + confirmation engine* (the genuinely
   hard part this codebase nails) as an API/SDK others embed. "Stripe-grade settlement guarantees
   for Solana, as a library."

The moat is **not** the payment link (trivial). It's the **exactly-once, verified settlement
ledger** — getting "did I really get paid?" correct under double-pays, dropped txs, Token-2022
transfer fees, and webhook failures. Most crypto-payment bugs are silent money bugs; being provably
correct is a real, defensible differentiator.

---

## 5. Competitive landscape & fee comparison

| Provider | Fee | Custody | Chain(s) | Note |
|----------|-----|---------|----------|------|
| **Stripe (cards)** | **2.9% + $0.30** (+1.5% intl, +1% FX) | Custodial | Cards | The incumbent everyone compares to |
| **Stripe (stablecoin)** | ~1.5% pay-in | Custodial | Base/etc. | On by default in Checkout |
| **PayPal** | ~2.9% + fixed | Custodial | Cards | Same ballpark as Stripe |
| **Coinbase Commerce** | **1%** | Semi-custodial | Base + others | Settles to USDC |
| **Helio / MoonPay Commerce** | **2% (1% w/ NFT)** | Non-custodial | Solana + multi | Official Solana×Shopify, 6,000+ merchants |
| **Sphere** | ~custom | Non-custodial | Solana | Dev-focused payments API |
| **SolTip (this)** | **0% protocol fee** today; network ~$0.0005 | **Non-custodial** | Solana | You hold the funds; we just verify |

**The cost wedge:** a $1,000 invoice costs **~$32 on Stripe**, **~$10–20 on crypto incumbents**,
and **a fraction of a cent in network fees** through a direct peer-to-peer transfer like SolTip's.
That ~2–3% saving is the entire pitch to a merchant. On thin-margin or high-volume businesses it's
decisive.

---

## 6. How to actually make money

Being non-custodial means you *can't* skim a % the way Stripe does (the money never flows through
you). So monetization options, roughly in order of friction:

1. **Optional platform fee, opt-in via Solana Pay "transaction request."** Instead of a plain
   transfer, return a transaction that adds a **second transfer instruction** (e.g. 0.3–0.5%) to a
   fee wallet. Still non-custodial, still one signature for the payer, and **undercuts the 1–2%
   incumbents** while earning. This is the cleanest path and the architecture already supports it
   (the skill's "transaction request" mode). **Recommended primary model.**
2. **SaaS subscription** for merchant features: multiple team members, branded checkout pages,
   analytics/exports, recurring invoices, webhooks, multi-wallet routing. Flat $X/mo, no per-tx cut.
3. **Infrastructure/API pricing** — meter the reconciliation+confirmation API for developers
   ($ per 10k verifications, or seats). Sell correctness as a service.
4. **Fiat off-ramp referral** — partner with an on/off-ramp (so merchants can cash out to a bank)
   and earn referral revenue on conversions. This also solves the #1 merchant objection ("I need
   dollars in my bank"). High value; the partner carries the KYC/licensing.
5. **Premium RPC/infra bundling** — resell reliable RPC + uptime as part of a paid tier.

**Realistic blend:** free non-custodial tier (0% protocol fee) for adoption → **0.3% opt-in
transaction-request fee** + **SaaS tier** for businesses → **off-ramp referral** for cash-out. The
free tier is the growth engine; the fee and SaaS tiers monetize the serious users.

---

## 7. Platforms to integrate (distribution > product)

You won't win by users finding your URL. You win by being *inside* tools they already use:

- **Shopify app** — the single biggest crypto-commerce channel (Helio proved it). Hard to displace
  the incumbent, but a cheaper non-custodial app can carve share.
- **WooCommerce / WordPress plugin** — long tail of SMBs, less locked up.
- **Invoicing tools** — Zapier/Make integration so "create SolTip link" fires from
  QuickBooks/Xero/HubSpot/Notion invoices.
- **Creator platforms** — overlay/bio-link integrations (Linktree-style, OBS for streamers).
- **Developer SDK** — npm package + REST API so any app embeds checkout in an afternoon. This repo
  is already 80% of that SDK.
- **Telegram / Discord bots** — "request payment" commands; crypto-native communities convert well.
- **Wallets** — Phantom/Solflare deep links already work via Solana Pay (zero integration needed on
  their side — a real advantage).

---

## 8. Why it can be cheaper (the structural argument)

- **No card-network interchange.** Visa/Mastercard interchange (~1.5–2.5%) is the bulk of the 2.9%.
  Crypto skips it entirely.
- **No custody = no float, no compliance overhead, no charge-back reserves.** Custodial processors
  price in fraud loss, chargeback ops, and money-transmission compliance. A non-custodial verifier
  carries almost none of that.
- **Solana network fees are ~$0.0005/tx** and roughly flat regardless of amount — so unlike the
  "+$0.30" fixed card fee, **micropayments and large payments are both efficient**.
- **Settlement is instant**, removing the cost of payout delays and reconciliation labor.

The honest caveat: "cheaper" assumes the customer already holds stablecoins. The cost of *acquiring
crypto* (on-ramp fees, ~1–3%) sits with the customer, not the merchant — but it's still friction in
the funnel.

---

## 9. Security & trust protocols (what earns merchant confidence)

This is where the app already leads — the 9 **payment safety laws** are the trust story:

- **Non-custodial / no private keys** (Law #7) — the app literally cannot lose or steal funds; it
  has read-only RPC access. This is the single biggest trust and regulatory advantage.
- **Server-authoritative amounts & recipients** (Law #1) — a hostile customer can't alter price or
  payee; the client only learns *which* invoice to pay.
- **Verify the mint + token program, not the symbol** (Law #2) — blocks spoofed-token attacks
  (someone sending a worthless look-alike "USDC").
- **Exactly-once crediting via a DB unique index** (Law #5) — replays, double-deliveries, and
  webhook forgeries can't double-credit.
- **Reconciliation is the source of truth; webhooks are a hint** (Law #6) — resilient to downtime
  and forged webhooks; a poller backs every payment.
- **Commitment-by-value confirmation** (Law #4) — wait for `finalized` on high-value, so you don't
  ship goods against a transaction that gets dropped/reorged.
- **Token-2022 awareness** — handles transfer-fee mints where "received < sent," a classic silent
  bug. Verification is based on **what actually landed**, never on what was requested.

**To productionize the trust story further:** SOC2 roadmap, signed webhooks, audit logging, rate
limiting + WAF, optional multisig (Squads) treasury guidance for merchants, and a published
security model. None require taking custody.

---

## 10. Advantages, moat, and the honest risks

**Advantages**
- Structurally **~2–3% cheaper** than cards, **2–4× cheaper** than crypto incumbents (0% vs 1–2%).
- **Non-custodial** → lower regulatory surface, faster to ship, inherently more trustworthy.
- **Instant, global, no chargebacks** — strong for cross-border B2B and high-risk verticals.
- **Works with existing wallets** via Solana Pay — no wallet partnership needed.
- **Correctness as a moat** — the verified, exactly-once settlement engine is genuinely hard and
  most competitors get the edge cases wrong.

**Risks / hard problems (don't skip these)**
- **Adoption ceiling:** customers must already hold stablecoins. This is *the* gating constraint.
- **Off-ramp gap:** merchants ultimately want bank dollars. You must partner for fiat cash-out or
  you only serve crypto-native users.
- **Incumbents are entrenched & funded:** Stripe (Bridge, default stablecoins), Coinbase, MoonPay
  (Helio). Competing head-on on "generic payment link" loses; win a vertical or a price/UX wedge.
- **Monetization friction:** non-custodial makes skimming a % awkward (solved via opt-in
  transaction-request fee + SaaS, but it's less automatic than custodial).
- **Regulation still moving:** even non-custodial software can attract money-transmission scrutiny
  in some jurisdictions; get legal review before charging fees or touching fiat. (Hand off to a
  crypto-legal advisor — out of scope for this codebase.)
- **Volatility (for SOL):** stablecoins solve this; steer merchants to USDC, not SOL, for pricing.

---

## 11. How to actualize it — a concrete sequence

**Phase 0 — Sharpen (now):** pick ONE wedge (freelancer USDC invoicing is the recommended start).
Keep the free non-custodial core.

**Phase 1 — MVP+ (0–3 mo):** this app, hardened — accounts/auth, branded pay pages, invoice
history/exports, the **opt-in 0.3% transaction-request fee** wired in, signed webhooks. Ship the
**npm SDK + REST API** in parallel (it's most of the moat).

**Phase 2 — Distribution (3–9 mo):** Shopify + WooCommerce apps, Zapier integration, a Telegram/
Discord payment bot. Partner with an on/off-ramp for fiat cash-out (referral revenue + removes the
biggest objection). Add subscriptions (delegate-approval pattern).

**Phase 3 — Trust & scale (9–18 mo):** SOC2 path, audit logging, multisig treasury guidance,
analytics dashboard, SaaS tiers for businesses, and case studies in the chosen vertical.

**Pricing to launch with:** Free (0% protocol fee, network cost only) → **Pro** ~$19–49/mo (branded
pages, team, recurring, exports) → **opt-in 0.3% transaction fee** (undercuts 1–2% incumbents) →
off-ramp referral. Land merchants on free via the cost saving, expand to paid via features.

---

## Sources

- [Stripe fees 2026 (2.9% + 30¢)](https://checkoutpage.com/blog/stripe-processing-fees) ·
  [Stripe fee structure guide](https://www.acodei.com/blog/stripe-fee-structure-guide)
- [Helio / MoonPay Commerce fees (2%/1%) & 6,000+ merchants](https://igamingpaymentsolutions.com/providers/helio-pay) ·
  [Helio Solana×Shopify case study](https://solana.com/news/case-study-helio) ·
  [Helio funding](https://www.globenewswire.com/news-release/2023/04/13/2646504/0/en/Helio-Raises-3-3-Million-to-Power-Web3-Payments-for-Merchants.html)
- [Coinbase Commerce 1% fee](https://help.coinbase.com/en/commerce/getting-started/fees) ·
  [Coinbase Commerce review](https://blockfinances.fr/en/coinbase-commerce-review-fees-guide)
- [Stripe 2025 letter — stablecoin volume ~$400B, Bridge 4×](https://whitesight.net/stripes-1-1-billion-bridge-to-programmable-money/) ·
  [Visa/Stripe/Mastercard rebuild payments on stablecoins](https://cryptoslate.com/visa-stripe-mastercard-rebuild-payments-stablecoins/)
- [Stripe×Shopify USDC across 34 countries](https://www.opendue.com/blog/mass-adoption-of-crypto-payments-in-e-commerce-examples-from-shopify-and-stripe) ·
  [Chainalysis stablecoin utility](https://www.chainalysis.com/blog/stablecoin-utility-future-of-payments/)
