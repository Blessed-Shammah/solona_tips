// Runnable safety-property tests: `node --test` (no dependencies).
// Each test maps to a law in ../../rules/payments.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toBaseUnits, buildSolanaPayUrl, verifyTransfer, Ledger, settleInvoice, Scheduler,
  SPL_TOKEN_PROGRAM, TOKEN_2022_PROGRAM,
} from "./core.mjs";

const MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC (verified)
const ATA = "MerchantAtaPubkey1111111111111111111111111";

function tx({ amount, mint = MINT, ata = ATA, tokenProgram = SPL_TOKEN_PROGRAM, err = null, signature = "sigA" }) {
  return {
    signature, tokenProgram,
    meta: { err, preTokenBalances: [{ ata, mint, amount: "0" }], postTokenBalances: [{ ata, mint, amount: String(amount) }] },
  };
}

test("Law #3: decimals math is integer-only, no float drift", () => {
  assert.equal(toBaseUnits("10.00", 6), 10_000_000n);
  assert.equal(toBaseUnits("0.000001", 6), 1n);
  assert.equal(toBaseUnits("1", 0), 1n);
  assert.throws(() => toBaseUnits("1.0000001", 6), /too many decimal places/);
  assert.throws(() => toBaseUnits("10.0.0", 6), /invalid amount/);
});

test("Solana Pay URL carries the unique reference and spl-token", () => {
  const url = buildSolanaPayUrl({ recipient: "Merch", amountDecimal: "10.00", mint: MINT, reference: "RefKey", label: "Acme" });
  assert.match(url, /^solana:Merch\?/);
  assert.match(url, /reference=RefKey/);
  assert.match(url, new RegExp(`spl-token=${MINT}`));
  assert.throws(() => buildSolanaPayUrl({ recipient: "Merch", amountDecimal: "1" }), /required/);
});

test("Law #4: exact payment verifies", () => {
  const r = verifyTransfer(tx({ amount: 10_000_000n }), { mint: MINT, tokenProgram: SPL_TOKEN_PROGRAM, merchantAta: ATA, expectedBaseUnits: 10_000_000n });
  assert.equal(r.ok, true);
  assert.equal(r.status, "exact");
});

test("Law #8: underpayment is rejected, overpayment is flagged not dropped", () => {
  const under = verifyTransfer(tx({ amount: 9_000_000n }), { mint: MINT, tokenProgram: SPL_TOKEN_PROGRAM, merchantAta: ATA, expectedBaseUnits: 10_000_000n });
  assert.equal(under.ok, false);
  assert.equal(under.status, "underpaid");
  const over = verifyTransfer(tx({ amount: 11_000_000n }), { mint: MINT, tokenProgram: SPL_TOKEN_PROGRAM, merchantAta: ATA, expectedBaseUnits: 10_000_000n });
  assert.equal(over.ok, true);
  assert.equal(over.status, "overpaid"); // caller refunds the excess
});

test("Law #2: wrong token program is rejected", () => {
  const r = verifyTransfer(tx({ amount: 10_000_000n, tokenProgram: TOKEN_2022_PROGRAM }), { mint: MINT, tokenProgram: SPL_TOKEN_PROGRAM, merchantAta: ATA, expectedBaseUnits: 10_000_000n });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "wrong_token_program");
});

test("Law #2: a spoof token (different mint) to the same reference does NOT credit", () => {
  const spoof = tx({ amount: 10_000_000n, mint: "SpoofMint1111111111111111111111111111111111" });
  const r = verifyTransfer(spoof, { mint: MINT, tokenProgram: SPL_TOKEN_PROGRAM, merchantAta: ATA, expectedBaseUnits: 10_000_000n });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "no_inbound_for_mint");
});

test("Law #5: webhook replay (same signature) credits exactly once", () => {
  const ledger = new Ledger();
  const verified = { signature: "sigA", received: 10_000_000n };
  assert.equal(settleInvoice(ledger, "inv1", verified).action, "fulfilled");
  assert.equal(settleInvoice(ledger, "inv1", verified).action, "noop_replay"); // replay absorbed
  assert.equal(ledger.creditsFor("inv1").length, 1);
});

test("Law #8: double-pay (two distinct transfers) credits once, flags the extra for refund", () => {
  const ledger = new Ledger();
  assert.equal(settleInvoice(ledger, "inv1", { signature: "sigA", received: 10_000_000n }).action, "fulfilled");
  const second = settleInvoice(ledger, "inv1", { signature: "sigB", received: 10_000_000n });
  assert.equal(second.action, "credited_extra_refund_due");
  assert.equal(second.refund, 10_000_000n);
});

test("Subscriptions: one charge per period even if the scheduler runs twice", () => {
  const s = new Scheduler();
  assert.equal(s.charge("sub1", "2026-07-01T00:00:00Z").charged, true);
  assert.equal(s.charge("sub1", "2026-07-01T00:00:00Z").charged, false); // idempotent period
  assert.equal(s.charge("sub1", "2026-08-01T00:00:00Z").charged, true);  // next period charges
});
