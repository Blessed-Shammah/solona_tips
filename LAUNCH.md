# Launch Plan — SolTip

How we take this from "builds clean locally" to "live and getting users." Honest, sequenced, and
specific. Companion docs: `DEPLOY.md` (infra), `RESEARCH.md` (market), `PLATFORM.md` (strategy).

---

## 0. The launch in one picture

```
HARDEN (must-do gates) ─▶ DEPLOY ─▶ SOFT LAUNCH (private) ─▶ PUBLIC LAUNCH ─▶ ITERATE
   accounts/auth,           Fly +     a few real users,        Product Hunt /     weekly on
   mainnet dry-run          volume    real $ end-to-end        X / communities    feedback
```

Don't skip HARDEN. Everything else is reversible; shipping a money bug is not.

---

## 1. Pre-launch hardening (the gates — do these first)

These are the difference between a demo and a product that holds real money.

- [ ] **Real signup/auth.** Today `/api/accounts` issues keys openly and `upgrade` is a free toggle.
      Add: email/wallet sign-in, key rotation, and gate Pro behind an actual paid subscription
      (charge through the spine). *(Owner: `spine-architect` + `payment-adapter-engineer`.)*
- [ ] **Mainnet dry-run.** Follow the checklist in `DEPLOY.md`: flip to mainnet + a paid RPC, then
      push **one real USDC payment** through a link AND one through a tool top-up. Confirm settle,
      credit, refund handling, and exactly-once behavior on real funds.
- [ ] **Rate limiting & abuse.** Per-key + per-IP limits on `/api/tools/*/invoke` and account
      creation (agents can hammer; bots will probe). Add a WAF/Cloudflare in front.
- [ ] **Secrets & ops.** Strong `ADMIN_SECRET`; secrets in the host's secret store (never in git);
      structured logs + an error tracker (Sentry); a backup of the SQLite volume (cron `cp`/litestream).
- [ ] **Legal sanity check.** Taking platform fees / touching fiat → get a crypto-legal review of
      your jurisdiction before charging. *(Hand off to a crypto-legal advisor — out of code scope.)*
- [ ] **Terms / Privacy pages.** Even minimal ones. Required by app stores, Stripe, and trust.

## 2. Launch assets (the storefront)

- [x] **Landing page** with hero, "how it’s used," who-it’s-for, FAQ, CTAs. ✅ done
- [x] **Logo + favicon** (`/logo.svg`, `app/icon.svg`). ✅ done
- [x] **Social share image** (`opengraph-image.tsx` → PNG og:image). ✅ done
- [ ] **Domain** — buy it, point DNS, set `NEXT_PUBLIC_SITE_URL` so OG/links are absolute.
- [ ] **Docs page** — a `/docs` route (or a docs site) with the API + MCP quickstart from the README.
- [ ] **Demo video / GIF** (60–90s): create a link → pay → "Paid"; and an agent calling a paid tool.
- [ ] **A 2nd compelling tool** that shows off agent value (e.g. an AI-powered one) — proves "snap-in."

## 3. Deploy

Follow `DEPLOY.md`. Recommended: Fly.io with a 1GB volume + secrets, `min_machines_running = 1`
(keeps the reconcile cron alive). Verify `/api/health`, `/api/tools`, and a full end-to-end before
announcing.

## 4. Soft launch (private, ~1–2 weeks)

- Invite 10–25 friendly users: a few agent devs, a couple freelancers/creators.
- Goal: catch real-world breakage, watch the `[reconcile]` logs, confirm money flows are flawless.
- Instrument: track signups, top-ups, tool calls, errors. Talk to every user.

## 5. Public launch (the moment)

Sequence for a single high-impact day:
1. **Product Hunt** — ship Tuesday–Thursday, 12:01am PT. Assets: tagline, gallery (use the OG +
   screenshots + demo GIF), first comment explaining the agent-payments angle.
2. **X/Twitter thread** — lead with the demo GIF of an AI agent paying for a tool (that's the hook).
   Tag the agent/Solana/x402 communities.
3. **Communities** — relevant Discords/subreddits/Farcaster: Solana devs, AI agent builders, indie
   hackers. Lead with the *problem you solve*, not "I built a thing."
4. **Show HN** — "Show HN: AI agents can discover, call, and pay for tools (x402 + MCP, on Solana)."
5. **Direct outreach** — DM 20 agent/tool builders who'd actually use it. Personal > broadcast.

**The hook to lead with everywhere:** *an AI agent autonomously paying for a tool, on-chain, in one
clip.* That's the novel, screenshot-able thing — not "payment links."

## 6. Post-launch (week 1+)

- Respond to everything; ship a visible fix within 24h to show momentum.
- Watch funnel: visit → signup → top-up → first paid call. Fix the biggest drop-off.
- Start the **AI-written blog** (SEO compounding) and the **catalog expansion** (more tools, then
  open it to third-party builders for the network effect).
- Add the next payment rail (cards via Stripe) to widen the top of funnel.

## 7. Metrics that matter (don't vanity-track)

| Metric | Why |
|--------|-----|
| Activation: signup → first **paid** call | the real "aha"; the whole funnel |
| Paid calls / week & $ settled | actual usage, actual revenue |
| Agent (x402/MCP) vs human calls | is the *new* market biting? |
| Reconcile errors / drift | money correctness — must stay ~0 |
| Retention: accounts calling in week 2+ | is it sticky or a toy |

---

### TL;DR sequence
**Harden (auth + mainnet dry-run + rate limits) → buy domain + deploy on Fly → soft launch to 25
users → public launch led by the "agent pays for a tool" clip → iterate on the activation funnel.**
