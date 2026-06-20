# Deploying SolTip (Docker + persistent disk)

SolTip stores its ledger in SQLite (a file), so it runs anywhere with a **disk volume** — a VPS,
Fly.io, Railway, Render, or your own box. Payments are reconciled by a **built-in cron** inside the
app, so no external scheduler is required (though `/api/reconcile` is still available).

> **One rule:** mount a persistent volume at `/app/data`. Without it, payment history and credit
> balances reset on every redeploy.

## Required environment

| Var | Value |
|-----|-------|
| `SOLANA_CLUSTER` | `mainnet` for real funds (`devnet` to test) |
| `RPC_URL` | A **paid** RPC for mainnet (Helius/Triton/QuickNode) |
| `MERCHANT_ADDRESS` | Your wallet public key — where funds land |
| `MERCHANT_LABEL` | Brand name shown to payers |
| `ADMIN_SECRET` | Protects link creation + `/api/reconcile` (**set this**) |
| `HELIUS_WEBHOOK_SECRET` | Optional; Helius Auth Header secret for instant settlement hints |
| `MERCHANT_SECRET_KEY` | Optional; merchant signer for live token refunds only |
| `DATABASE_PATH` | `/app/data/soltip.db` (on the mounted volume) |
| `RECONCILE_INTERVAL_MS` | optional, default `60000` |
| `ENABLE_RECONCILE_CRON` | optional, set `false` to disable the internal cron |
| `REDIS_URL` | optional; shared fixed-window rate limits for multi-instance deploys |

## Option A — Fly.io (recommended, has volumes)

```bash
fly launch --no-deploy
fly volumes create soltip_data --size 1 --region iad
fly secrets set MERCHANT_ADDRESS=YOUR_WALLET RPC_URL=YOUR_RPC ADMIN_SECRET=$(openssl rand -hex 24) MERCHANT_LABEL="SolTip"
fly deploy
```

`fly.toml` is already configured (volume mount, health check, `min_machines_running = 1` so the
reconcile cron stays alive).

## Option B — Railway / Render

Both auto-detect the `Dockerfile`. Then:
1. Add a **persistent volume** mounted at `/app/data`.
2. Set the env vars above.
3. Set the start to the image default (`node server.js`) — no override needed.

## Option C — Any VPS with Docker

```bash
# on the server, with the repo checked out:
cp .env.example .env     # fill in mainnet values + ADMIN_SECRET
docker compose up -d --build
```

`docker-compose.yml` already mounts the named volume `soltip-data` → `/app/data` and restarts on
boot. Put Nginx/Caddy in front for HTTPS (forwarded-host headers are already honored).

## Multi-instance scale

SQLite plus the internal reconcile loop is intended for one app instance with a persistent disk. When
you run more than one instance:

1. Move the ledger behind a storage adapter with the same UNIQUE constraints:
   - invoices: `reference`
   - payments: `(invoice_id, tx_signature)`
   - usage records: `call_id`
   - credit/plan applications: `invoice_id`
   - refunds: `payment_id`
2. Set `REDIS_URL` so signup/contact/tool invoke rate limits share counters across instances.
3. Set `ENABLE_RECONCILE_CRON=false` on every app instance.
4. Run one external scheduler, for example every minute:
   `curl -fsS -H "Authorization: Bearer $ADMIN_SECRET" https://your-host/api/reconcile`.

The app falls back to local in-memory rate limits if Redis is unavailable; treat that as degraded
protection and alert on `[ratelimit] Redis unavailable` logs.

## After deploy — verify

```bash
curl https://your-host/api/health           # {"ok":true,...}
curl https://your-host/api/tools            # catalog discovery
# create a key, top up a tiny amount, run a tool end-to-end before announcing.
```

## Helius webhook setup

The webhook is a fast settlement hint only. `/api/webhooks/helius` rejects unsigned requests, drains
the body without trusting it, then runs the same on-chain reconciliation path used by the poller.
Keep `/api/reconcile` running as the backstop.

1. Use a paid Helius RPC URL for `RPC_URL`.
2. Generate a webhook secret in your host secret store:
   `HELIUS_WEBHOOK_SECRET=$(openssl rand -hex 24)`.
3. In Helius, create an enhanced webhook that watches `MERCHANT_ADDRESS`.
4. Set the webhook URL to `https://your-host/api/webhooks/helius`.
5. Set the Helius Auth Header value to the exact `HELIUS_WEBHOOK_SECRET`.
6. Send a devnet payment first and confirm logs show a webhook hit followed by reconcile activity.

Do not credit directly from webhook JSON. If Helius changes payload shape, this route should still be
safe because the body is only a "go reconcile now" signal.

## Going to real funds — checklist

1. `SOLANA_CLUSTER=mainnet` + a paid `RPC_URL`.
2. Strong `ADMIN_SECRET`.
3. Optional refunds: set `MERCHANT_SECRET_KEY` from the same wallet as `MERCHANT_ADDRESS`; otherwise
   refunds remain `manual_required`.
4. Optional Helius: set `HELIUS_WEBHOOK_SECRET` and verify the webhook still only triggers reconcile.
5. Confirm the volume is mounted (`/api/health` ok across a redeploy keeps data).
6. Run a mainnet dry-run:
   - Create a low-value USDC payment link.
   - Pay it from a separate wallet and wait for `/pay/<id>` to show `Paid`.
   - Refresh `/admin` and confirm the invoice/payment appears once.
   - Top up a test account, call one tool with its API key, and confirm balance/usage move once.
   - Send a second payment to the same reference or an overpay only with a tiny amount; confirm a
     refund row appears. With a funded `MERCHANT_SECRET_KEY`, confirm status `sent` plus tx signature.
     Without it, confirm `manual_required`.
7. HTTPS in front; monitor `[reconcile]` logs, webhook responses, refund statuses, and RPC errors.
