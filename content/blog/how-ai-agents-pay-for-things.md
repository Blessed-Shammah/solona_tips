---
title: "How AI agents pay for things: x402, MCP, and the rise of machine commerce"
description: "AI agents can now call tools and APIs on their own — but paying for them is the missing piece. Here's how x402 and MCP let agents transact autonomously, and why verifiable settlement matters."
date: 2026-06-18
author: SolTip Research
tags: agent economy, x402, MCP, machine payments, stablecoins
reviewed: true
---

# How AI agents pay for things

AI agents got good at *doing* things — calling APIs, querying data, running tools — faster than the
internet figured out how to *charge* them for it. A human hits a paywall and pulls out a card. An
autonomous agent hits the same paywall and… stops. Closing that gap is the quiet infrastructure
problem behind the "agent economy," and it's being solved right now by two standards clicking
together: **MCP** for how agents find and call tools, and **x402** for how they pay.

## The problem: agents can act, but not transact

A modern agent can plan, reason, and invoke tools. But payments still assume a human in the loop:
an account created by hand, a card entered once, a subscription managed in a dashboard. None of that
survives contact with an agent that needs to call fifty different services, once each, at 3am, with
no human awake to approve anything.

What agents need is the opposite of a subscription: **pay-per-call, settle instantly, no signup.**

## MCP: how an agent discovers and calls a tool

The Model Context Protocol (MCP) is the emerging standard for exposing tools to AI models. A tool
provider runs an MCP server; any MCP-capable agent (Claude, for example) can list the available
tools, read their input schemas, and call them — without bespoke glue code per integration. MCP
solved discovery and invocation. It deliberately did *not* solve payment.

## x402: how an agent pays, in one HTTP status code

x402 revives the long-dormant **HTTP 402 "Payment Required"** status code as a machine-readable
payment handshake:

1. The agent calls a tool with no payment.
2. The server responds `402` with a challenge: the price, the rail, and a reference to pay against.
3. The agent pays — on-chain, in stablecoins — and retries with proof of payment.
4. The server verifies settlement and returns the result.

No account. No card. No human. The agent simply pays for what it uses, the way it would pay a toll.
Stablecoins on a fast chain make this practical: network fees are fractions of a cent, so charging
$0.002 for a single API call actually nets out.

## Why "verifiable settlement" is the hard part

Here's where most implementations quietly break. It's easy to return a `402`. It's hard to be
*certain* a payment landed before you hand over the goods — especially when:

- an agent **retries** a request and accidentally pays twice (a double-pay),
- a transaction is **seen but later dropped** (paid in appearance, not in reality),
- a token has **transfer fees** so the amount received is less than the amount sent,
- a **webhook is forged or missed**.

A payments bug doesn't throw an exception — it silently moves money. The only safe foundation is
**verify the settlement yourself, on-chain, and credit exactly once.** That means checking the real
balance delta (not trusting a library helper), matching the exact token and recipient, and guarding
the credit with a database uniqueness constraint so replays and double-deliveries can't double-spend.

## What this unlocks

When agents can pay autonomously and providers can trust settlement, a new market opens: a catalog
of tools and APIs priced per call, discoverable over MCP, payable over x402. An agent assembling a
workflow can buy exactly the capabilities it needs, when it needs them — and providers get paid
without onboarding a single human.

That's the shape of machine commerce: **standard interface + verifiable per-call settlement.** The
interface is becoming commodity. The settlement is the moat.

---

*Building agent-payable tools? [SolTip](/developers) exposes a catalog over MCP with exactly-once,
on-chain-verified billing — and answers x402 challenges out of the box.*

### Sources
- Model Context Protocol — [modelcontextprotocol.io](https://modelcontextprotocol.io)
- HTTP 402 status — [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/402)
- Solana network fees & confirmation — [solana.com/docs](https://solana.com/docs)
