# Codex Handoff — continue building SolTip

Paste this into Codex (or any coding agent) to continue where we left off. It carries the full
context, conventions, and the prioritized remaining work.

---

## CONTEXT

SolTip is a **non-custodial Solana payments + agent-payable tools platform** (Next.js App Router,
TypeScript, plain CSS tokens, better-sqlite3 ledger). Two products on one spine:
1. **Payment links** — create a link, payer pays in a wallet, funds settle to the merchant on-chain.
2. **Agent-payable tools** — a catalog of tools billed per call from prepaid credits (API key) or via
   the **x402** flow (HTTP 402 → pay on-chain → retry with `X-Payment-Reference`). Exposed over **MCP**.

Read these first: `PLATFORM.md` (vision), `README.md` (run/setup), `DEPLOY.md`, `LAUNCH.md`,
`solana-payments-skill/rules/payments.md` (the **9 payment safety laws — non-negotiable**).

### Architecture / key files
- Spine (the moat): `src/lib/spine/adapter.ts` (rail-agnostic `charge()→verifiedSettlement`),
  `solana-adapter.ts`, `registry.ts`, `store.ts` (accounts/tools/usage/credits, all exactly-once via
  UNIQUE indexes), `meter.ts`, `credits.ts`, `catalog.ts`, `ratelimit.ts`, `api-auth.ts`.
- Payments core (tested, zero-dep): `src/lib/payments-core.mjs` + `tests/*.test.mjs` (18 passing).
- Verification: `src/lib/verify.ts` (getSignaturesForAddress(reference) + on-chain balance-delta).
- Reconcile cron: `src/lib/reconcile.ts` + `src/instrumentation.ts` (internal, calls /api/reconcile).
- API: `src/app/api/**` (accounts, account/*, credits/*, tools, tools/[slug]/invoke, checkout,
  invoice/[id]/status, reconcile, contact, blog/generate, openapi.json, health).
- UI: `src/app/{page,developers,docs,pricing,blog,links,contact,pay}` + `src/components/*`.
  Global chrome: `SiteHeader.tsx` / `SiteFooter.tsx` in `src/app/layout.tsx`.
- Blog: markdown in `content/blog/`, reader `src/lib/blog/posts.ts`, AI writer
  `src/lib/blog/generate.mjs` (multi-provider).

### Conventions (MUST follow)
- **Payment safety laws**: server owns amount/recipient/mint; verify the mint + token program; read
  decimals on-chain; "paid" = confirmed + verified; **exactly-once crediting via a DB UNIQUE index**;
  reconcile (webhooks are a hint); no private keys; explicit under/over-pay policy; fresh unique
  `reference` per invoice. Add a test for every money path (mirror `tests/metering.test.mjs`).
- **Design system**: brutalist "Verifiable Ledger" — light canvas, 1px grid lines, hard offset
  shadows, square corners, Syne display / Inter body / JetBrains Mono. Tokens in
  `src/app/globals.css`. **No native `alert/confirm/prompt`** — use `src/components/Modal.tsx`.
- **Dev workflow**: `npm run dev` for iteration. **Do NOT run `next build` while `next dev` is
  running** (they share `.next` and it corrupts the dev server). Verify types with `npm run typecheck`
  (safe) during dev; run `npm run build` only when dev is stopped or in CI/Docker.
- Verify: `npm run typecheck`, `npm test`, then `npm run build`. Keep all green.

---

## REMAINING WORK (in priority order)

### 1. Real authentication (highest priority — gates everything)
Today accounts are created openly and the dashboard stores the API key in `localStorage`. Add:
- Email + password (hashed, e.g. scrypt) **or** Sign-in-with-wallet (sign a nonce) — pick one, wire it.
- Sessions via httpOnly secure cookies; a `sessions` table or signed JWT.
- Link a login to its `accounts` row; protect the dashboard + sensitive routes by session, not just
  the raw key. Keep API keys for programmatic/agent access (that's correct), but gate the UI by login.
- Add sign-up / log-in / log-out pages in the design system. Rate-limit auth endpoints.

### 2. Helius webhooks (instant settlement)
Currently settlement is a 60s poll. Add `POST /api/webhooks/helius`:
- **Verify the signing secret on every delivery** (reject unsigned/forged).
- Treat the body as a hint only: extract signature/reference, then **re-verify on-chain** via the
  existing `verifyInvoice` path and credit exactly-once (reuse `settleInvoice` / `runReconcilePass`).
- Keep the poller as the backstop (Track B). Document Helius setup in DEPLOY.md.

### 3. Refund execution
`refund_due` is flagged on overpay/double-pay but never executed. Build a refund path:
- An admin-gated `POST /api/refunds` that, given a payment, returns the excess to the payer.
- This requires a SIGNING wallet (the merchant's) — keep keys out of code; use an env-injected signer
  behind an interface (Safety Law #7). Build a `transferChecked` back to the payer, record it,
  clear `refund_due`. Add tests for the refund accounting.

### 4. Admin dashboard
A session-protected `/admin` page: list contact messages (`GET /api/contact`), invoices, usage,
accounts, refunds due, and reconcile status. Read-only first, then actions (issue refund, etc.).

### 5. Pay page + payment-link creator polish
`src/app/pay/[id]/page.tsx` and `src/components/CreateLinkForm.tsx` still use the older card layout.
Restyle into the brutalist system (hard shadows, mono amounts, unmistakable paid/pending/failed).

### 6. Legal + launch
Add `/terms` and `/privacy` pages. (A crypto-legal review before charging fees is a human task —
flag it, don't fake it.) Then: domain, `NEXT_PUBLIC_SITE_URL`, deploy per DEPLOY.md, and a
**mainnet dry-run** (one real USDC payment through a link and a tool top-up).

### 7. Scale (only when one box isn't enough)
Abstract storage so SQLite → Postgres is a swap (keep the UNIQUE constraints). Move the rate limiter
+ reconcile cron to Redis + an external scheduler for multi-instance. Add CI (typecheck+test+build)
and a Playwright E2E smoke test. Run `npm audit` and resolve the moderate advisories.

---

## DEFINITION OF DONE for each task
Types pass, money paths have tests, the design system is respected, no native dialogs, and the
feature is verified end-to-end (curl or Playwright) before declaring done. Report honestly what's
verified vs. not.
