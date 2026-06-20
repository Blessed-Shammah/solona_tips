---
description: Scaffold a working Solana stablecoin checkout (server-authoritative) and a devnet test.
---

# /scaffold-checkout

Generate a minimal, safe checkout for the user's stack. Steps:

1. Ask (or infer): framework (default Next.js route handlers), rail (default USDC), value tier
   (→ commitment level), DB for the ledger.
2. Load `skill/SKILL.md`, `rules/payments.md`, and verify the rail's mint/decimals/program from
   `skill/resources.md` (and on-chain).
3. Emit:
   - `POST /api/checkout` — creates a server-authoritative invoice + unique `reference`, returns the
     Solana Pay URL/QR. (`checkout.md`)
   - `GET /api/invoice/:id/status` — client polls; flips to `paid` only after verification.
   - A verifier using `getSignaturesForAddress(reference)` + on-chain checks. (`confirmation.md`)
   - Exactly-once credit guarded by a DB unique index. (`reconciliation.md`)
   - The happy-path + wrong-mint + double-pay tests from `testing.md`.
4. Never put amount/recipient under client control; never embed a private key; use `transferChecked`.
5. Run the tests on a local validator / mainnet-fork; report pass/fail honestly before declaring done.
