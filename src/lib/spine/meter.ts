// meter.ts — invoke a tool: enforce plan quota, run the handler, and charge exactly-once.
// The whole point of the platform: an agent calls, we meter and bill per call, verifiably.
import {
  type Account,
  type Tool,
  getUsageByCallId,
  usageCountSince,
  meterTxn,
  InsufficientCredits,
} from "./store";
import { runHandler } from "./catalog";

// Free vs Pro gating ("borrow features, they pay"). Free is rate-limited; Pro is not.
export const FREE_DAILY_CALLS = 100;
const DAY_MS = 24 * 60 * 60_000;

export type InvokeResult =
  | { ok: true; output: Record<string, unknown>; costMicros: number; replay: boolean }
  | { ok: false; reason: "insufficient_credits" | "quota_exceeded" | "bad_input"; message?: string };

export async function invokeTool(
  account: Account,
  tool: Tool,
  callId: string,
  input: Record<string, unknown>,
): Promise<InvokeResult> {
  // Idempotency: a repeated call_id returns the original result, never double-charges.
  const prior = getUsageByCallId(callId);
  if (prior) {
    return { ok: true, output: safeParse(prior.output), costMicros: prior.cost_micros, replay: true };
  }

  // Free-plan daily quota (the paywall: upgrade to Pro for unlimited).
  if (account.plan === "free" && usageCountSince(account.id, Date.now() - DAY_MS) >= FREE_DAILY_CALLS) {
    return { ok: false, reason: "quota_exceeded", message: `Free plan is capped at ${FREE_DAILY_CALLS} calls/day. Upgrade to Pro.` };
  }

  // Cheap pre-check (the authoritative check is the atomic debit below).
  if (account.balance_micros < tool.price_micros) {
    return { ok: false, reason: "insufficient_credits" };
  }

  // Run the actual tool. Bad input is a 4xx, not a charge.
  let output: Record<string, unknown>;
  try {
    output = await runHandler(tool.slug, input);
  } catch (e) {
    return { ok: false, reason: "bad_input", message: (e as Error).message };
  }

  // Charge exactly-once + debit atomically.
  try {
    meterTxn(account.id, tool.id, tool.slug, callId, tool.price_micros, JSON.stringify(output));
  } catch (e: unknown) {
    if (e instanceof InsufficientCredits) return { ok: false, reason: "insufficient_credits" };
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "SQLITE_CONSTRAINT_UNIQUE") {
      // Concurrent duplicate call_id won the race — return its stored result.
      const now = getUsageByCallId(callId);
      if (now) return { ok: true, output: safeParse(now.output), costMicros: now.cost_micros, replay: true };
    }
    throw e;
  }

  return { ok: true, output, costMicros: tool.price_micros, replay: false };
}

function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
