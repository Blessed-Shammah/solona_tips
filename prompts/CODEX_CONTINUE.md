# Codex — continue from here (current task in progress)

Paste into Codex. This is the *live* state mid-task. For full project context + conventions, also
read `prompts/CODEX_HANDOFF.md` and `solana-payments-skill/rules/payments.md` (the 9 payment safety
laws — non-negotiable).

## Current task (two features)
1. **Show ALL contact-us messages in the admin dashboard.**
2. **A user profile page** showing a logged-in user's important info.

## What's already done (in the working tree, NOT yet typechecked/built/deployed)
- `src/lib/spine/store.ts` → added `accountUsageSummary(accountId)` (calls + spentMicros for one account).
- `src/app/api/auth/me/route.ts` → now also returns `created_at` and `usage: { calls, spent_usd }`.
- `src/app/profile/page.tsx` → NEW client page: identity header (avatar initial, name, email, plan
  pill), Account card (email/plan/member-since/account id), a stats strip (credit balance, tool
  calls, total spent), an API-key card (masked + copy + link to console), and Open-console / Log-out
  actions. Fetches `/api/auth/me`; shows a sign-in prompt when logged out.

## What REMAINS to finish this task
1. **Admin = all contact messages.** Today `src/app/api/admin/overview/route.ts` calls
   `listContactMessages(20)`. Change it to return all (raise the limit to e.g. 500, or add real
   pagination) and include a total count. Then in `src/app/admin/page.tsx` render the full list in
   the "Contact messages" section and show the count in the header. (`listContactMessages(limit)`
   already exists in `store.ts`.)
2. **Add a "Profile" nav link.** Edit `src/components/SiteHeader.tsx` (LINKS array) and optionally
   `SiteFooter.tsx`. The `/profile` page already handles the logged-out case, so a plain link is fine.
3. **Clean up the balance formatting** in `src/app/profile/page.tsx` — the
   `me.balance_usd.replace(/0+$/, "")...` is hacky. Format from `balance_micros` to 2 dp instead.
4. **Verify**: `npm run typecheck`, then `npm test` (expect 20 passing), then — with the dev server
   STOPPED — `npm run build`. The new `/profile` route and updated `me`/admin should all compile.

## Conventions you MUST follow
- **Auth model:** sessions (httpOnly cookie `soltip_session`) gate the human UI; API keys
  (`Authorization: Bearer sk_live_…`) gate programmatic/agent access. The profile page uses
  `/api/auth/me` (session). Admin endpoints use `isAdmin()` from `src/lib/auth.ts` which **fails
  closed** (no `ADMIN_SECRET` configured ⇒ locked) — do NOT switch admin routes back to the lenient
  `isAuthorized`.
- **Design system** (brutalist "Verifiable Ledger"): light canvas, 1px grid lines, hard offset
  shadows, square corners (radius 0), Syne display / Inter body / JetBrains Mono. Tokens in
  `src/app/globals.css`. **No native `alert/confirm/prompt`** — use `src/components/Modal.tsx`.
- **Dev workflow gotcha:** do NOT run `next build` while `next dev` is running (they share `.next`
  and it corrupts the dev server → every route 500s). Use `npm run typecheck` during dev; run
  `npm run build` only with dev stopped, or in Docker/CI.
- **Money paths** stay exactly-once via DB UNIQUE indexes; add a test (mirror
  `tests/metering.test.mjs`) for anything touching credits/usage/refunds.

## Running it (the app runs in Docker, port 3000)
Changes only show after a rebuild — the container runs a built image, not the source:
```bash
docker build -t soltip:latest . && docker rm -f soltip && \
docker run -d --name soltip -p 3000:3000 --env-file .env -v soltip-data:/app/data soltip:latest
```
`.env` has `ADMIN_SECRET` set (needed to view `/admin`). For fast UI iteration, use `npm run dev`
instead and rebuild the image only when satisfied.

## Bigger backlog (after these two features) — see prompts/CODEX_HANDOFF.md
Live refund payout (signer behind `MERCHANT_SECRET_KEY`), mainnet dry-run, multi-instance scale
(SQLite→Postgres, rate-limiter/cron→Redis), CI + Playwright E2E, `npm audit` fixes.

## Definition of done
Types pass, tests green, design system respected, no native dialogs, admin stays fail-closed, and
the two features verified in the browser (all contact messages visible in `/admin`; `/profile`
shows the logged-in user's info; logged-out `/profile` shows a sign-in prompt).
