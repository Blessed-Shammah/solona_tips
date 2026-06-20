// payments-core — the network-free heart of the skill, as runnable reference code.
// These are the pure functions where money bugs hide. They run with `node --test` (no deps),
// so the safety laws in ../../rules/payments.md are executable, not just prose.
// On-chain pieces (getSignaturesForAddress, transferChecked, Token-2022) are exercised by the
// integration tests in ./integration (require a validator) — see README.

export const SPL_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

// Safety Law #3: money math is integer-only. Parse a decimal string to base units with no floats.
export function toBaseUnits(amountDecimal, decimals) {
  if (!/^\d+(\.\d+)?$/.test(amountDecimal)) throw new Error(`invalid amount: ${amountDecimal}`);
  const [whole, frac = ""] = amountDecimal.split(".");
  if (frac.length > decimals) throw new Error(`too many decimal places for a ${decimals}-decimal mint`);
  const padded = frac.padEnd(decimals, "0");
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || "0");
}

// Solana Pay transfer-request URL with the all-important unique `reference`.
export function buildSolanaPayUrl({ recipient, amountDecimal, mint, reference, label, message }) {
  if (!recipient || !reference) throw new Error("recipient and reference are required");
  const p = new URLSearchParams();
  p.set("amount", amountDecimal);
  if (mint) p.set("spl-token", mint);
  p.set("reference", reference);
  if (label) p.set("label", label);
  if (message) p.set("message", message);
  return `solana:${recipient}?${p.toString()}`;
}

// Received amount derived from on-chain balance deltas — never from the request we sent.
// (Simplified from the RPC pre/postTokenBalances shape; same idea: post - pre for (ata, mint).)
export function tokenBalanceDelta(tx, ata, mint) {
  const find = (arr) => (arr ?? []).find((b) => b.ata === ata && b.mint === mint);
  const pre = find(tx.meta?.preTokenBalances);
  const post = find(tx.meta?.postTokenBalances);
  return (post ? BigInt(post.amount) : 0n) - (pre ? BigInt(pre.amount) : 0n);
}

// Safety Law #8: classify, never silently settle "close enough".
export function classifyPayment(received, expected) {
  if (received < expected) return "underpaid";
  if (received > expected) return "overpaid";
  return "exact";
}

// Safety Laws #2 + #4: a tx touching the reference is necessary, not sufficient. Verify everything.
export function verifyTransfer(tx, { mint, tokenProgram, merchantAta, expectedBaseUnits }) {
  if (tx.meta?.err) return { ok: false, reason: "tx_failed" };
  if (tx.tokenProgram !== tokenProgram) return { ok: false, reason: "wrong_token_program" };
  const received = tokenBalanceDelta(tx, merchantAta, mint);
  if (received <= 0n) return { ok: false, reason: "no_inbound_for_mint" }; // wrong/spoofed mint
  const status = classifyPayment(received, expectedBaseUnits);
  return { ok: status !== "underpaid", status, received, signature: tx.signature };
}

// Safety Law #5: exactly-once crediting, gated by a unique (invoiceId, signature) constraint.
// In-memory stand-in for the DB unique index in ../../skill/reconciliation.md.
export class Ledger {
  #payments = new Map(); // `${invoiceId}::${signature}` -> record
  creditOnce(invoiceId, signature, amount) {
    const key = `${invoiceId}::${signature}`;
    if (this.#payments.has(key)) return { credited: false, reason: "duplicate" };
    this.#payments.set(key, { invoiceId, signature, amount });
    return { credited: true };
  }
  creditsFor(invoiceId) {
    return [...this.#payments.values()].filter((p) => p.invoiceId === invoiceId);
  }
}

// Credit a verified payment once; surface a second distinct transfer as a refund-due (double-pay).
export function settleInvoice(ledger, invoiceId, verified) {
  const res = ledger.creditOnce(invoiceId, verified.signature, verified.received);
  if (!res.credited) return { action: "noop_replay" };
  return ledger.creditsFor(invoiceId).length > 1
    ? { action: "credited_extra_refund_due", refund: verified.received }
    : { action: "fulfilled" };
}

// Subscriptions: one charge per (subscription, period) even if the scheduler runs twice.
export function periodKey(subId, periodStartISO) {
  return `${subId}:${periodStartISO}`;
}
export class Scheduler {
  #charged = new Set();
  charge(subId, periodStartISO) {
    const k = periodKey(subId, periodStartISO);
    if (this.#charged.has(k)) return { charged: false, reason: "already_charged_this_period" };
    this.#charged.add(k);
    return { charged: true };
  }
}
