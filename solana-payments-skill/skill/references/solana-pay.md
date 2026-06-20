# solana-pay.md — Solana Pay requests

**Goal:** encode a payment the wallet understands, carrying a `reference` you can later find
on-chain. Spec: `docs.solanapay.com/spec` (verified in `resources.md`).

## Two request types

| Type | Shape | Use when |
|------|-------|----------|
| **Transfer request** | A URL the wallet turns into a transfer it builds | Fixed amount, simple checkout, POS, QR |
| **Transaction request** | A URL pointing to *your* endpoint that returns a base64 tx | You need custom instructions (memo, fee split, multiple transfers, gating) |

## Transfer request URL

```
solana:<merchant>?amount=<decimal>&spl-token=<mint>&reference=<refPubkey>&label=<m>&message=<m>
```

- `<merchant>` = recipient wallet (for SPL, the wallet owner; the wallet resolves the ATA).
- `amount` is a **decimal** (e.g. `10.00`), not base units.
- `spl-token` = the mint (omit for native SOL — but this skill is stablecoins).
- `reference` = a **fresh, unique** base58 pubkey per invoice (Safety Law #9). It is attached as a
  read-only, non-signer key so validators index it. This is your correlation id.
- Multiple `reference` params are allowed; one unique key per invoice is enough.

```ts
import { generateKeyPairSigner } from "@solana/kit";

// reference is just a unique pubkey; you never need its secret — generate and keep the pubkey.
const reference = (await generateKeyPairSigner()).address; // store with the invoice
const url =
  `solana:${merchant}` +
  `?amount=${amountDecimal}` +
  `&spl-token=${mint}` +
  `&reference=${reference}` +
  `&label=${encodeURIComponent(merchantName)}` +
  `&message=${encodeURIComponent("Order " + invoiceId)}`;
// Render `url` as a QR (any QR lib) or as a deep link button.
```

## Transaction request (when you need control)

The wallet GETs your URL for a label/icon, then POSTs `{account}` (the payer). You return a
base64-serialized transaction. **Build the transfer server-side** so amount/mint/recipient are never
client-controlled (Safety Law #1), and attach the same `reference` key.

```
GET  /api/pay/:invoiceId  -> { label, icon }
POST /api/pay/:invoiceId  -> { transaction: <base64>, message }   // body: { account }
```

Server builds a `transferChecked` instruction (correct token program + decimals from the mint),
adds the `reference` as a read-only key, sets fee payer = payer, recent blockhash, and serializes
*without* signatures for the wallet to sign.

## Why `reference` is the whole game

Because the wallet attaches `reference` to the transfer, you can later call
`getSignaturesForAddress(reference)` to find exactly the transaction that paid this invoice —
**before** you ever know its signature. That single primitive powers `confirmation.md` and
`reconciliation.md`.

→ Next: assemble the flow in `checkout.md`; verify receipt in `confirmation.md`.
