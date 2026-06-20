# SolTip — Solana stablecoin payment links

Create a payment link, share it, get paid. Funds land **directly in your wallet** — SolTip is
**non-custodial** and never holds keys or money. It only watches the chain to *prove* a payment
reached you.

> 📊 **Thinking about the business?** See [`RESEARCH.md`](./RESEARCH.md) — market sizing, use
> cases, fee comparison vs. Stripe/Helio/Coinbase, monetization, integrations, security, and a
> phased go-to-market plan.

Built on the [`solana-payments`](./solana-payments-skill) skill bundle and its **9 payment safety
laws** ([`rules/payments.md`](./solana-payments-skill/rules/payments.md)). Those laws are not just
prose here — they're executable tests (`npm test`, 11/11 passing).

## How it works

```
1. You (merchant) create an invoice  →  server derives amount, mint, recipient, and a fresh
                                          unique `reference` pubkey. The client never sets these.
2. Share the /pay/<id> link          →  payer sees a QR + "Open in wallet" (Solana Pay URL).
3. Payer pays in their wallet        →  the wallet attaches your `reference` to the transfer.
4. Server discovers the tx via       →  getSignaturesForAddress(reference), then VERIFIES the
   reference & verifies it on-chain      transfer from balance deltas (mint, recipient, amount).
5. Exactly-once credit               →  guarded by a SQLite UNIQUE(invoice_id, tx_signature) index.
6. Pay page flips to "Paid".
```

A wallet saying **"sent" is not "paid"** — only the server's on-chain verification is authoritative.

## Why it's safe (the safety laws, enforced)

| Law | Where it's enforced |
|-----|---------------------|
| #1 Server owns amount/recipient/mint | `api/checkout` derives everything; client only picks rail + amount to *request* |
| #2 Verify the mint + token program | `rails.ts` reads the owning program **on-chain**; `verifyTransfer` rejects wrong program / spoofed mint |
| #3 Never hardcode decimals | decimals read from the mint account (byte 44); integer-only `toBaseUnits` |
| #4 "Paid" = confirmed + verified | commitment chosen by value; balance-delta check, not a library helper |
| #5 Exactly-once crediting | `UNIQUE(invoice_id, tx_signature)` index in SQLite |
| #6 Reconciliation > webhooks | `/api/reconcile` cron poller (Track B) backs the fast client poll (Track A) |
| #7 No private keys | normal settlement is read-only; optional live refunds sign only from env-injected `MERCHANT_SECRET_KEY` |
| #8 Under/over-payment policy | classified explicitly; overpay/double-pay flagged `refund_due`, never silently kept |
| #9 Fresh unique reference | one generated keypair pubkey per invoice |

## Supported rails

Chosen per-link. Decimals + token program are always resolved on-chain.

- **Mainnet:** USDC, USDG, PYUSD (Token-2022), SOL
- **Devnet:** USDC, SOL

## Setup (step by step)

**Prerequisites:** Node.js 20+ (and Docker, optional). A Solana wallet (Phantom, Solflare, or any).

**1. Get your wallet address.** This is where money lands. Open your wallet → copy your **public**
address (e.g. `6dNVtHQp…`). Never share or paste a *private* key — SolTip never needs one.

**2. Pick an RPC endpoint.**
- Devnet (testing): `https://api.devnet.solana.com` (free).
- Mainnet (real funds): use a paid provider — [Helius](https://helius.dev),
  [Triton](https://triton.one), or [QuickNode](https://quicknode.com). Public mainnet RPCs
  rate-limit and will drop your reconciliation polls.

**3. Configure environment.**
```bash
cp .env.example .env.local
```
Edit `.env.local`:
```ini
SOLANA_CLUSTER=devnet                       # devnet while testing
RPC_URL=https://api.devnet.solana.com
MERCHANT_ADDRESS=<your wallet public key>   # where funds land
MERCHANT_LABEL=Your Brand
ADMIN_SECRET=                               # leave blank for local; SET for any public deploy
```

**4. Install and run.**
```bash
npm install
npm run dev          # → http://localhost:3000
```

**5. Try it.** On the home page choose a currency + amount → **Create payment link** → open the
`/pay/<id>` link. You'll see a QR + "Open in wallet" and a live status that flips to **Paid** once
the server verifies an on-chain payment.

**6. (Optional) Get free devnet USDC** to test a real payment: airdrop devnet SOL with
`solana airdrop 2 <addr> --url devnet`, then mint test USDC from Circle's
[devnet faucet](https://faucet.circle.com). Send it to an open invoice and watch it flip to Paid.

**Verify the build:**
```bash
npm test          # 11/11 payment safety-law tests (zero deps)
npm run build     # production build
```

### Going to mainnet (real-funds checklist)

1. `SOLANA_CLUSTER=mainnet` and a **paid** `RPC_URL`.
2. Set a strong `ADMIN_SECRET` (protects link creation + `/api/reconcile`).
3. Run the reconcile poller on a schedule (see below).
4. Test with a small real payment first.
5. Serve over HTTPS behind a reverse proxy (forwarded-host is already honored).

> **Start on devnet.** Keep `SOLANA_CLUSTER=devnet` while testing so you never spend real money.

## Run with Docker (lightweight Alpine)

Multi-stage build: `better-sqlite3` is compiled against musl in a builder stage; the final image
ships only `libstdc++` + the Next standalone server.

```bash
cp .env.example .env            # fill in MERCHANT_ADDRESS, RPC_URL, etc.
docker compose up --build       # http://localhost:3000
```

The SQLite ledger persists in the named volume `soltip-data` (`/app/data` in the container).

Or plain Docker:

```bash
docker build -t soltip .
docker run -p 3000:3000 --env-file .env -v soltip-data:/app/data soltip
```

## Agent-payable tools (Phase 1 platform)

The platform layer (`src/lib/spine/`) turns the payment engine into a **marketplace of tools that AI
agents can use and pay for** — rail-agnostic and verifiable. See `PLATFORM.md` for the vision.

- **Open the console:** `/developers` (get an API key, top up credits, run tools) · pricing at `/pricing`.
- **Discover tools (agent-readable):** `GET /api/tools`
- **Invoke a tool — two ways to pay:**

```bash
# A) API key + prepaid credits (draws from balance, exactly-once via Idempotency-Key)
curl -X POST http://localhost:3000/api/tools/uuid/invoke \
  -H "authorization: Bearer sk_live_..." -H "idempotency-key: abc123" \
  -H "content-type: application/json" -d '{"input":{"count":2}}'

# B) x402 autonomous agent payment (no account):
#  1. Call with no payment → 402 with a Solana Pay challenge + a `reference`
#  2. Pay the pay_uri on-chain
#  3. Retry with header  X-Payment-Reference: <reference>  → tool runs, settlement verified
```

**Architecture (the moat):** every tool calls one rail-agnostic interface
`charge(amount) → verifiedSettlement` (`src/lib/spine/adapter.ts`). Solana is the first adapter;
cards/other chains/bank rails slot in behind the same interface with zero changes to any tool.
Metering, credits, and top-ups are all exactly-once (covered by `tests/metering.test.mjs`).

## MCP server — let AI agents use the tools natively

The catalog is exposed over the **Model Context Protocol**, so Claude (Desktop/Code) and any
MCP-capable agent can discover, call, and pay for tools automatically.

```bash
# 1. Run the app (npm run dev). 2. Point an MCP client at the server:
SOLTIP_BASE_URL=http://localhost:3000 SOLTIP_API_KEY=sk_live_... npm run mcp
# Quick end-to-end check (spawns the server, lists + calls tools):
SOLTIP_BASE_URL=http://localhost:3000 SOLTIP_API_KEY=sk_live_... node mcp/test-client.mjs
```

Add to a Claude MCP client with `mcp/config.example.json` (set an absolute path + a funded key).
With a funded key, calls draw from prepaid credits; **without a key, the agent gets an x402 payment
challenge** it can fulfill on-chain and retry — fully autonomous machine payment.

## Reconciliation (production)

Run the poller on a schedule so missed/delayed payments still settle (Safety Law #6):

```bash
# every minute, e.g. via cron / Vercel Cron / a sidecar
curl -H "Authorization: Bearer $ADMIN_SECRET" https://your-host/api/reconcile
```

## Configuration

See [`.env.example`](./.env.example). Key vars:

- `SOLANA_CLUSTER` — `devnet` | `mainnet`
- `RPC_URL` — RPC endpoint (paid provider recommended for mainnet)
- `MERCHANT_ADDRESS` — **your** wallet (public key) where funds land
- `ADMIN_SECRET` — protects link creation + the reconcile endpoint (set this on any public deploy)
- `MERCHANT_SECRET_KEY` — optional; enables live token refunds from the merchant wallet. If unset,
  refund rows are recorded as `manual_required`.

## What's verified vs. not

- ✅ Money-math, mint/program checks, exactly-once crediting, double-pay flagging — covered by
  `npm test` and a live SQLite unique-index probe.
- ✅ End-to-end invoice creation → on-chain reference resolution → pay page/QR → status polling,
  smoke-tested against live devnet RPC.
- ➡️ A full *paid* transfer requires sending real devnet/mainnet funds to an invoice's reference;
  that's the on-chain integration step beyond automated tests here.
```
