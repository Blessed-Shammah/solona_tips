// POST /api/tools/:slug/invoke — the platform's flagship endpoint. Two ways to pay:
//
//  A) API key + prepaid credits  → draw the per-call price from the account balance (exactly-once).
//  B) x402 autonomous payment    → no account; we answer 402 with a pay-per-call challenge, the
//                                   agent pays on-chain, then retries with X-Payment-Reference.
//
// This is the "AI agents can use AND pay for tools" core — rail-agnostic and verifiable.
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getTool } from "@/lib/spine/store";
import { invokeTool } from "@/lib/spine/meter";
import { runHandler } from "@/lib/spine/catalog";
import { insertUsageOnce, getUsageByCallId } from "@/lib/spine/store";
import { accountFromRequest } from "@/lib/spine/api-auth";
import { getAdapter } from "@/lib/spine/registry";
import { rateLimit, clientIp, maybeSweep } from "@/lib/spine/ratelimit";

const X402_ACCOUNT = "x402"; // sentinel "account" for anonymous pay-per-call usage records

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const tool = getTool(slug);
  if (!tool) return NextResponse.json({ error: "tool not found" }, { status: 404 });

  // Abuse guard: rate-limit per API key when present, else per IP. (Agents can hammer endpoints.)
  maybeSweep();
  const apiKey = req.headers.get("authorization")?.replace(/^Bearer /, "") || req.headers.get("x-api-key") || "";
  const rlKey = `invoke:${apiKey || clientIp(req)}`;
  const rl = await rateLimit(rlKey, 120, 60_000); // 120 calls/min
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retry_after_sec: rl.retryAfterSec },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } },
    );
  }

  let body: { input?: Record<string, unknown> } & Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine for a challenge request */
  }
  const input = (body.input as Record<string, unknown>) ?? body ?? {};
  const priceUsd = (tool.price_micros / 1_000_000).toFixed(6);

  // ── Mode A: authenticated account with prepaid credits ──────────────────────
  const account = accountFromRequest(req);
  if (account) {
    const callId = req.headers.get("idempotency-key")?.trim() || randomUUID();
    const result = await invokeTool(account, tool, callId, input);

    if (result.ok) {
      return NextResponse.json(
        { ok: true, tool: slug, output: result.output, cost_usd: priceUsd, call_id: callId, replay: result.replay },
        { headers: { "Idempotency-Key": callId } },
      );
    }
    if (result.reason === "bad_input") return NextResponse.json({ error: result.message }, { status: 400 });
    if (result.reason === "quota_exceeded") return NextResponse.json({ error: result.message }, { status: 429 });
    // insufficient credits → answer with a top-up challenge (agents can auto-recharge)
    return challenge(tool, priceUsd, "Insufficient credits — pay to proceed or top up your balance.");
  }

  // ── Mode B: x402 anonymous pay-per-call ─────────────────────────────────────
  const paymentRef = req.headers.get("x-payment-reference")?.trim();
  if (!paymentRef) {
    return challenge(tool, priceUsd, "Payment required to call this tool.");
  }

  // Already redeemed? Return the original result (idempotent), never re-charge a reference.
  const prior = getUsageByCallId(paymentRef);
  if (prior) {
    return NextResponse.json({ ok: true, tool: slug, output: JSON.parse(prior.output || "{}"), cost_usd: priceUsd, paid: true, replay: true });
  }

  // Verify the on-chain payment for this reference actually settled and covers the price.
  const settlement = await getAdapter("solana").verify(paymentRef, tool.price_micros / 1_000_000);
  if (settlement.status !== "settled") {
    return NextResponse.json(
      { error: "payment_not_settled", status: settlement.status, retry_with: "X-Payment-Reference header once settled" },
      { status: 402 },
    );
  }
  if (settlement.creditMicros < BigInt(tool.price_micros)) {
    return NextResponse.json({ error: "underpaid", needed_usd: priceUsd }, { status: 402 });
  }

  // Run the tool, then consume the payment exactly-once (the unique call_id guards double-redeem).
  let output: Record<string, unknown>;
  try {
    output = await runHandler(slug, input);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  const first = insertUsageOnce(X402_ACCOUNT, tool.id, slug, paymentRef, tool.price_micros, JSON.stringify(output));
  if (!first) {
    const now = getUsageByCallId(paymentRef);
    return NextResponse.json({ ok: true, tool: slug, output: JSON.parse(now?.output || "{}"), cost_usd: priceUsd, paid: true, replay: true });
  }
  return NextResponse.json({ ok: true, tool: slug, output, cost_usd: priceUsd, paid: true });
}

// A machine-readable 402 challenge: how to pay for one call, x402-style.
async function challenge(tool: { slug: string; price_micros: number }, priceUsd: string, message: string) {
  const handle = await getAdapter("solana").charge({
    amountDecimal: priceUsd,
    orderId: randomUUID(),
    rail: "USDC",
    memo: `Call ${tool.slug}`,
  });
  return NextResponse.json(
    {
      error: "payment_required",
      message,
      price_usd: priceUsd,
      rail: handle.instructions.rail,
      pay_to: handle.instructions.recipient,
      pay_uri: handle.instructions.payUri,
      reference: handle.reference,
      expires_at: handle.instructions.expiresAt,
      retry: "After paying, resend this request with header  X-Payment-Reference: <reference>",
    },
    { status: 402 },
  );
}
