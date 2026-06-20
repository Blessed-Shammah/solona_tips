// credits.ts — buy prepaid credits through the rail-agnostic adapter, and apply them exactly-once
// when the payment settles. Today the rail is Solana/USDC; tomorrow a card adapter funds the same
// balance with zero changes here.
import { randomUUID } from "node:crypto";
import { getAdapter } from "./registry";
import {
  recordCreditOrder, getCreditOrder, applyCreditOnce, getAccount,
  recordPlanOrder, getPlanOrder, applyPlanUpgradeOnce,
} from "./store";

/** Pro plan price (USD). Configurable; small default eases devnet testing. */
export const PRO_PRICE_USD = (process.env.PRO_PRICE_USD || "29.00").trim();

export interface TopUpHandle {
  orderId: string;
  payUri: string;
  rail: string;
  amountDecimal: string;
  recipient: string;
  expiresAt: number;
}

/** Create a credit top-up charge for an account. `amountDecimal` is USD (USDC). */
export async function createTopUp(accountId: string, amountDecimal: string, railId = "solana"): Promise<TopUpHandle> {
  const adapter = getAdapter(railId);
  const orderId = randomUUID();
  const handle = await adapter.charge({
    amountDecimal,
    orderId,
    rail: "USDC",
    memo: `Credit top-up for account ${accountId.slice(0, 8)}`,
  });

  // USDC is 6dp → micros == base units. Persist intent so settlement can credit the right account.
  const micros = Math.round(Number(amountDecimal) * 1_000_000);
  recordCreditOrder(handle.reference, accountId, micros);

  return {
    orderId: handle.reference,
    payUri: handle.instructions.payUri,
    rail: handle.instructions.rail,
    amountDecimal: handle.instructions.amountDecimal,
    recipient: handle.instructions.recipient,
    expiresAt: handle.instructions.expiresAt,
  };
}

export interface TopUpStatus {
  status: "pending" | "settled" | "underpaid" | "expired" | "unknown";
  applied: boolean;
  balanceMicros: number;
}

/**
 * Check a top-up's settlement and, if settled, credit the account balance EXACTLY ONCE.
 * Safe to call repeatedly (status poll) and from the reconcile cron — the apply is idempotent.
 */
export async function settleTopUp(orderId: string, railId = "solana"): Promise<TopUpStatus> {
  const order = getCreditOrder(orderId);
  if (!order) return { status: "unknown", applied: false, balanceMicros: 0 };

  const settlement = await getAdapter(railId).verify(orderId, order.micros / 1_000_000);
  let applied = false;
  if (settlement.status === "settled") {
    applied = applyCreditOnce(orderId, order.account_id, order.micros);
  }
  const acct = getAccount(order.account_id);
  return {
    status: settlement.status,
    applied,
    balanceMicros: acct?.balance_micros ?? 0,
  };
}

// ── Pro upgrade (gated behind a real payment) ─────────────────────────────────
export async function createUpgradeOrder(accountId: string, railId = "solana"): Promise<TopUpHandle> {
  const adapter = getAdapter(railId);
  const orderId = randomUUID();
  const handle = await adapter.charge({
    amountDecimal: PRO_PRICE_USD,
    orderId,
    rail: "USDC",
    memo: `SolTip Pro upgrade · account ${accountId.slice(0, 8)}`,
  });
  recordPlanOrder(handle.reference, accountId, "pro");
  return {
    orderId: handle.reference,
    payUri: handle.instructions.payUri,
    rail: handle.instructions.rail,
    amountDecimal: handle.instructions.amountDecimal,
    recipient: handle.instructions.recipient,
    expiresAt: handle.instructions.expiresAt,
  };
}

export async function settleUpgrade(orderId: string, railId = "solana"): Promise<{ status: string; applied: boolean; plan: string }> {
  const order = getPlanOrder(orderId);
  if (!order) return { status: "unknown", applied: false, plan: "free" };
  const settlement = await getAdapter(railId).verify(orderId, Number(PRO_PRICE_USD));
  let applied = false;
  if (settlement.status === "settled") {
    applied = applyPlanUpgradeOnce(orderId, order.account_id, order.plan);
  }
  const acct = getAccount(order.account_id);
  return { status: settlement.status, applied, plan: acct?.plan ?? "free" };
}
