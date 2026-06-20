# checkout.md — end-to-end web checkout

**Goal:** a working checkout where the **server owns the truth** and the client only learns which
invoice to pay. Stack: Next.js (route handlers) + `@solana/kit`. Obeys Safety Laws #1, #4, #5, #9.

## The flow (never trust the client)

```
1. Client: "checkout order 4821"
2. Server: create invoice → { amount, mint, merchant } from YOUR pricing, never the client.
           generate unique `reference`, persist invoice{ id, amount, mint, reference, status:'pending' }.
3. Server → Client: the Solana Pay URL/QR (reference embedded) — NOT the raw amount as authority.
4. Client: pays in wallet.
5. Server: watches `reference` (poll getSignaturesForAddress), verifies the tx (confirmation.md),
           marks invoice 'paid' exactly once (reconciliation.md).
6. Client: polls GET /invoice/:id/status → flips to 'paid'.
```

## Create the invoice (server)

```ts
// POST /api/checkout  — server-authoritative
import { generateKeyPairSigner } from "@solana/kit";

const order = await db.orders.get(orderId);            // your data
const { mint, decimals, tokenProgram, merchantAta } = resolveRail(order.currency); // rails.md
const amountDecimal = order.totalUsd.toFixed(decimals === 6 ? 2 : 2);

const reference = (await generateKeyPairSigner()).address;
const invoice = await db.invoices.create({
  orderId, mint, amountDecimal, reference, status: "pending",
  idempotencyKey: `${orderId}:${reference}`,           // Safety Law #5
});

return Response.json({ url: buildSolanaPayUrl({ merchant, mint, amountDecimal, reference, invoice }) });
```

## Status endpoint (client polls this)

```ts
// GET /api/invoice/:id/status
const inv = await db.invoices.get(id);
return Response.json({ status: inv.status }); // 'pending' | 'paid' | 'expired' | 'underpaid'
```

The client polls (or subscribes) and reveals success **only when the server says `paid`** — never
when the wallet reports "sent". A wallet "sent" is not settlement.

## Expiry

Give invoices a TTL (e.g. 15 min). On expiry, mark `expired` and refuse late credit unless your
policy reopens it. Always reconcile expired invoices once more before final close — a payment may
have landed at the edge of the window.

## What to hand off

- To `confirmation.md`: `{ reference, mint, decimals, merchantAta, expectedBaseUnits }`.
- To `reconciliation.md`: the invoice row + `idempotencyKey`.

`★ Design note:` the client receives a *pointer* (the reference/URL), never spendable authority over
amount or recipient. That asymmetry is what makes the checkout safe even with a hostile client.

→ Verify the payment really landed: `confirmation.md`.
