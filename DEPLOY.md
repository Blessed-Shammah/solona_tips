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
| `DATABASE_PATH` | `/app/data/soltip.db` (on the mounted volume) |
| `RECONCILE_INTERVAL_MS` | optional, default `60000` |
| `ENABLE_RECONCILE_CRON` | optional, set `false` to disable the internal cron |

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

## After deploy — verify

```bash
curl https://your-host/api/health           # {"ok":true,...}
curl https://your-host/api/tools            # catalog discovery
# create a key, top up a tiny amount, run a tool end-to-end before announcing.
```

## Going to real funds — checklist

1. `SOLANA_CLUSTER=mainnet` + a paid `RPC_URL`.
2. Strong `ADMIN_SECRET`.
3. Confirm the volume is mounted (`/api/health` ok across a redeploy keeps data).
4. Do one small real payment end-to-end before launch.
5. HTTPS in front; monitor the `[reconcile]` logs.
