// Executable payment safety laws. Zero deps: `node --test`.
// Each test names the safety law (rules/payments.md) it enforces.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toBaseUnits,
  fromBaseUnits,
  buildSolanaPayUrl,
  classifyPayment,
  verifyTransfer,
  verifyNativeTransfer,
  settleInvoice,
  Ledger,
  SPL_TOKEN_PROGRAM,
  TOKEN_2022_PROGRAM,
} from "../src/lib/payments-core.mjs";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const MERCHANT = "MerchantOwnerPubkey11111111111111111111111";

// Helper to fabricate a tx with token balance deltas for the merchant.
function txWith({ owner = MERCHANT, mint = USDC, pre = "0", post, tokenProgram = SPL_TOKEN_PROGRAM, err = null, signature = "sig1" }) {
  return {
    signature,
    err,
    tokenProgram,
    meta: {
      err,
      preTokenBalances: [{ owner, mint, uiTokenAmount: { amount: pre } }],
      postTokenBalances: [{ owner, mint, uiTokenAmount: { amount: post } }],
    },
  };
}

test("Law #3 — decimals math: integer-only base units, rejects float drift", () => {
  assert.equal(toBaseUnits("10.00", 6), 10_000_000n);
  assert.equal(toBaseUnits("0.000001", 6), 1n);
  assert.equal(toBaseUnits("1234", 6), 1_234_000_000n);
  assert.throws(() => toBaseUnits("1.0000001", 6), /too many decimal places/);
  assert.throws(() => toBaseUnits("abc", 6), /invalid amount/);
  assert.throws(() => toBaseUnits("1e6", 6), /invalid amount/);
  assert.equal(fromBaseUnits(10_000_000n, 6), "10");
  assert.equal(fromBaseUnits(1n, 6), "0.000001");
});

test("Solana Pay URL — carries unique reference + spl-token", () => {
  const url = buildSolanaPayUrl({
    recipient: MERCHANT,
    amountDecimal: "10.00",
    mint: USDC,
    reference: "Ref111",
    label: "My Store",
    message: "Order 7",
  });
  assert.ok(url.startsWith(`solana:${MERCHANT}?`));
  assert.match(url, /amount=10\.00/);
  assert.match(url, new RegExp(`spl-token=${USDC}`));
  assert.match(url, /reference=Ref111/);
});

test("Solana Pay URL — native SOL omits spl-token", () => {
  const url = buildSolanaPayUrl({ recipient: MERCHANT, amountDecimal: "1", mint: "native-sol", reference: "Ref222" });
  assert.doesNotMatch(url, /spl-token/);
  assert.match(url, /amount=1/);
});

test("Law #4/#8 — exact / under / over classification", () => {
  assert.equal(classifyPayment(10_000_000n, 10_000_000n), "exact");
  assert.equal(classifyPayment(9_999_999n, 10_000_000n), "underpaid");
  assert.equal(classifyPayment(10_000_001n, 10_000_000n), "overpaid");
});

test("Law #4 — underpaid is rejected (ok=false)", () => {
  const res = verifyTransfer(txWith({ post: "9999999" }), {
    mint: USDC, tokenProgram: SPL_TOKEN_PROGRAM, merchantOwner: MERCHANT, expectedBaseUnits: 10_000_000n,
  });
  assert.equal(res.ok, false);
  assert.equal(res.status, "underpaid");
});

test("Law #8 — overpaid is accepted but flagged, never silently kept", () => {
  const res = verifyTransfer(txWith({ post: "10000001" }), {
    mint: USDC, tokenProgram: SPL_TOKEN_PROGRAM, merchantOwner: MERCHANT, expectedBaseUnits: 10_000_000n,
  });
  assert.equal(res.ok, true);
  assert.equal(res.status, "overpaid");
});

test("Law #2 — wrong token program is rejected", () => {
  const res = verifyTransfer(txWith({ post: "10000000", tokenProgram: TOKEN_2022_PROGRAM }), {
    mint: USDC, tokenProgram: SPL_TOKEN_PROGRAM, merchantOwner: MERCHANT, expectedBaseUnits: 10_000_000n,
  });
  assert.equal(res.ok, false);
  assert.equal(res.reason, "wrong_token_program");
});

test("Law #2 — spoofed mint (different mint to same reference) does NOT credit", () => {
  // Attacker sends a worthless token; merchant's USDC balance does not move.
  const tx = {
    signature: "sigSpoof", err: null, tokenProgram: SPL_TOKEN_PROGRAM,
    meta: { err: null,
      preTokenBalances: [{ owner: MERCHANT, mint: "FAKEmint1111111111111111111111111111111111", uiTokenAmount: { amount: "0" } }],
      postTokenBalances: [{ owner: MERCHANT, mint: "FAKEmint1111111111111111111111111111111111", uiTokenAmount: { amount: "10000000" } }],
    },
  };
  const res = verifyTransfer(tx, {
    mint: USDC, tokenProgram: SPL_TOKEN_PROGRAM, merchantOwner: MERCHANT, expectedBaseUnits: 10_000_000n,
  });
  assert.equal(res.ok, false);
  assert.equal(res.reason, "no_inbound_for_mint");
});

test("Law #5 — webhook replay credits exactly once", () => {
  const ledger = new Ledger();
  const verified = { signature: "sigA", received: 10_000_000n };
  assert.equal(settleInvoice(ledger, "inv1", verified).action, "fulfilled");
  assert.equal(settleInvoice(ledger, "inv1", verified).action, "noop_replay"); // replay
  assert.equal(ledger.creditsFor("inv1").length, 1);
});

test("Law #8 — double-pay: two distinct transfers credit once, flag the extra", () => {
  const ledger = new Ledger();
  assert.equal(settleInvoice(ledger, "inv2", { signature: "sigX", received: 10_000_000n }).action, "fulfilled");
  const second = settleInvoice(ledger, "inv2", { signature: "sigY", received: 10_000_000n });
  assert.equal(second.action, "credited_extra_refund_due");
  assert.equal(second.refund, 10_000_000n);
});

test("Native SOL — lamport delta verifies merchant inbound", () => {
  const tx = { signature: "sigSol", err: null, meta: { err: null, preBalances: [1_000_000_000], postBalances: [2_000_000_000] } };
  const res = verifyNativeTransfer(tx, { merchantAccountIndex: 0, expectedBaseUnits: 1_000_000_000n });
  assert.equal(res.ok, true);
  assert.equal(res.status, "exact");
});
