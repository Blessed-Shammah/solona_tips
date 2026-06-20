// payments-core — the network-free heart of SolTip, ported from the solana-payments skill.
// These are the pure functions where money bugs hide, so they live with ZERO dependencies and
// are covered by `node --test` (see tests/payments-core.test.mjs). The safety laws in
// solana-payments-skill/rules/payments.md are executable here, not just prose.

export const SPL_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

// The native-SOL sentinel. SOL is not an SPL token, so verification reads lamport deltas
// (see verifyNativeTransfer) instead of token balances.
export const NATIVE_SOL = "native-sol";

// ── Safety Law #3: money math is integer-only. Parse a decimal string to base units, no floats.
export function toBaseUnits(amountDecimal, decimals) {
  if (typeof amountDecimal !== "string" || !/^\d+(\.\d+)?$/.test(amountDecimal)) {
    throw new Error(`invalid amount: ${amountDecimal}`);
  }
  const [whole, frac = ""] = amountDecimal.split(".");
  if (frac.length > decimals) {
    throw new Error(`too many decimal places for a ${decimals}-decimal mint`);
  }
  const padded = frac.padEnd(decimals, "0");
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || "0");
}

// Inverse of toBaseUnits — format base units back to a human decimal string (display only).
export function fromBaseUnits(baseUnits, decimals) {
  const v = BigInt(baseUnits);
  const d = BigInt(decimals);
  const divisor = 10n ** d;
  const whole = v / divisor;
  const frac = (v % divisor).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

// Solana Pay transfer-request URL with the all-important unique `reference`.
// Omit `mint` for native SOL. See solana-payments-skill/skill/references/solana-pay.md.
export function buildSolanaPayUrl({ recipient, amountDecimal, mint, reference, label, message, memo }) {
  if (!recipient || !reference) throw new Error("recipient and reference are required");
  const p = new URLSearchParams();
  p.set("amount", amountDecimal);
  if (mint && mint !== NATIVE_SOL) p.set("spl-token", mint);
  p.set("reference", reference);
  if (label) p.set("label", label);
  if (message) p.set("message", message);
  if (memo) p.set("memo", memo);
  return `solana:${recipient}?${p.toString()}`;
}

// Received amount derived from on-chain token balance deltas — never from the request we sent.
// Matches the RPC pre/postTokenBalances shape: entries carry { owner, mint, uiTokenAmount.amount }.
// We match on the recipient OWNER + mint (equivalent to, and simpler than, deriving the ATA).
export function tokenBalanceDelta(meta, owner, mint) {
  const find = (arr) =>
    (arr ?? []).find((b) => b.owner === owner && b.mint === mint);
  const amt = (b) => (b ? BigInt(b.uiTokenAmount?.amount ?? b.amount ?? 0) : 0n);
  return amt(find(meta?.postTokenBalances)) - amt(find(meta?.preTokenBalances));
}

// Native SOL lamport delta for an account at a given index in the tx's account list.
export function lamportDelta(meta, accountIndex) {
  const pre = meta?.preBalances?.[accountIndex];
  const post = meta?.postBalances?.[accountIndex];
  if (pre == null || post == null) return 0n;
  return BigInt(post) - BigInt(pre);
}

// ── Safety Law #8: classify, never silently settle "close enough".
export function classifyPayment(received, expected) {
  const r = BigInt(received);
  const e = BigInt(expected);
  if (r < e) return "underpaid";
  if (r > e) return "overpaid";
  return "exact";
}

// ── Safety Laws #2 + #4: a tx touching the reference is necessary, not sufficient.
// Verify the mint, the recipient, and the amount that ACTUALLY landed.
//   tx = { meta, tokenProgram, signature, err }
export function verifyTransfer(tx, { mint, tokenProgram, merchantOwner, expectedBaseUnits }) {
  if (tx.err || tx.meta?.err) return { ok: false, reason: "tx_failed" };
  if (tokenProgram && tx.tokenProgram && tx.tokenProgram !== tokenProgram) {
    return { ok: false, reason: "wrong_token_program" };
  }
  const received = tokenBalanceDelta(tx.meta, merchantOwner, mint);
  if (received <= 0n) return { ok: false, reason: "no_inbound_for_mint" }; // wrong/spoofed mint
  const status = classifyPayment(received, expectedBaseUnits);
  return { ok: status !== "underpaid", status, received, signature: tx.signature };
}

// Native-SOL counterpart: verify the merchant's lamport balance rose by at least the expected amount.
export function verifyNativeTransfer(tx, { merchantAccountIndex, expectedBaseUnits }) {
  if (tx.err || tx.meta?.err) return { ok: false, reason: "tx_failed" };
  const received = lamportDelta(tx.meta, merchantAccountIndex);
  if (received <= 0n) return { ok: false, reason: "no_inbound" };
  const status = classifyPayment(received, expectedBaseUnits);
  return { ok: status !== "underpaid", status, received, signature: tx.signature };
}

// ── Safety Law #5: exactly-once crediting, gated by a unique (invoiceId, signature) constraint.
// In-memory stand-in used by tests; the real ledger uses a SQLite UNIQUE index (src/lib/db.ts).
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
