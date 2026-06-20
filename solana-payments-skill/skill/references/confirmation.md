# confirmation.md — "did I really get paid?"

**Goal:** turn a wallet's "sent" into a server-proven "paid". This is where most payment bugs hide.
Obeys Safety Laws #2, #3, #4.

## Commitment levels — what "paid" means

| Commitment | Meaning | Use for |
|------------|---------|---------|
| `processed` | seen by a node, can be dropped/forked | **never** treat as paid |
| `confirmed` | voted by supermajority; reorg extremely unlikely | low/medium-value goods |
| `finalized` | rooted, irreversible | high-value, withdrawals, off-ramp |

**Pick a threshold by value.** Digital good for $5 → `confirmed`. Releasing $5,000 to fiat →
`finalized`. State the threshold in code; don't leave it implicit (Safety Law #4).

> **2026 reality (Alpenglow):** Solana's Alpenglow consensus upgrade drives finality toward
> ~150 ms, so `finalized` is far cheaper to wait for than it used to be — but *faster finality does
> not remove the discipline*. `processed` is still droppable; you still pick a commitment by value
> and still verify the transfer. Speed changed; the rule didn't.

## Find the paying transaction via `reference`

You don't wait for the client to report a signature — you discover it:

```ts
import { createSolanaRpc, address } from "@solana/kit";
const rpc = createSolanaRpc(process.env.RPC_URL!);

// 1. Locate candidate signatures that touched this invoice's reference key.
const sigs = await rpc.getSignaturesForAddress(address(invoice.reference), { limit: 10 }).send();
if (sigs.length === 0) return { status: "pending" };

// 2. Fetch the transaction at your value-appropriate commitment.
const sig = sigs[0].signature;
const tx = await rpc.getTransaction(sig, {
  commitment: "confirmed",                 // or "finalized" for high value
  maxSupportedTransactionVersion: 0,
}).send();
if (!tx || tx.meta?.err) return { status: "pending" };
```

## Verify the transfer — do NOT trust that the tx exists

A transaction touching your reference is necessary, not sufficient. **Verify it yourself** from the
on-chain transaction — do not lean on a library helper alone. (The `@solana/pay` `validateTransfer`
/ `findReference` path has a documented edge case where validation could accept multiple transfers;
your own balance-delta check is the authority.) Inspect the token balance deltas
(`meta.preTokenBalances` / `postTokenBalances`):

1. **Mint** matches the invoice mint (Safety Law #2) — and the owning token program.
2. **Recipient** is your `merchantAta` (the merchant's ATA for that mint).
3. **Amount** received ≥ `expectedBaseUnits` (decimals from the mint, Safety Law #3). Because this
   measures what *actually landed* in the merchant ATA, it is automatically correct for Token-2022
   **transfer fees** — set `expectedBaseUnits` net-of-fee, never to the gross requested amount.
4. (Optional) memo / payer constraints if your flow requires them.

```ts
const merchantDelta = tokenBalanceDelta(tx, invoice.merchantAta, invoice.mint); // post-pre, base units
if (merchantDelta < invoice.expectedBaseUnits) return { status: "underpaid", received: merchantDelta };
// else: verified — hand to reconciliation for exactly-once crediting.
```

## Under / over-payment policy (Safety Law #8)

Decide explicitly:
- **Underpaid** → status `underpaid`; don't deliver; offer top-up or refund.
- **Overpaid** → deliver + queue a refund of the excess, or credit balance. Never silently keep it.
- **Exact** → proceed.

## Retries, dropped tx, expiry

- Polling that finds nothing = still `pending`; keep polling until invoice TTL.
- A `processed` tx that never reaches `confirmed` may have been dropped — treat as not paid.
- Network retries from the payer can create **two** successful transfers to the same reference →
  that's a double-pay; reconciliation must credit once and flag the extra for refund.

→ Credit it safely and exactly once: `reconciliation.md`.
