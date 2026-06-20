// GET /api/openapi.json — machine-readable API contract (OpenAPI 3.1). Humans read it via /docs;
// agents and codegen tools can consume it directly. Kept in sync with the route handlers by hand.
import { NextResponse } from "next/server";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "SolTip API",
    version: "1.0.0",
    description:
      "Agent-payable tools + non-custodial payment links on Solana. Tools are metered and billed " +
      "either from prepaid credits (API key) or per-call via the x402 flow. All settlement is " +
      "verified on-chain and credited exactly-once.",
  },
  servers: [{ url: "/", description: "This host" }],
  security: [{ ApiKeyAuth: [] }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "http",
        scheme: "bearer",
        description: "Your account API key as `Authorization: Bearer sk_live_…` (or `X-API-Key`).",
      },
    },
    schemas: {
      Account: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          api_key: { type: "string", description: "Shown once on creation." },
          plan: { type: "string", enum: ["free", "pro"] },
          balance_usd: { type: "string" },
        },
      },
      Tool: {
        type: "object",
        properties: {
          slug: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          price_usd: { type: "string" },
          price_micros: { type: "integer" },
          input: { type: "object", additionalProperties: { type: "string" } },
          invoke: { type: "string" },
        },
      },
      PaymentChallenge: {
        type: "object",
        description: "x402 response body (HTTP 402) — how to pay for one call.",
        properties: {
          error: { type: "string", example: "payment_required" },
          price_usd: { type: "string" },
          rail: { type: "string", example: "USDC" },
          pay_to: { type: "string" },
          pay_uri: { type: "string", example: "solana:<merchant>?amount=…&spl-token=…&reference=…" },
          reference: { type: "string" },
          retry: { type: "string" },
        },
      },
      Error: { type: "object", properties: { error: { type: "string" } } },
    },
  },
  paths: {
    "/api/health": {
      get: { summary: "Liveness probe", security: [], responses: { "200": { description: "OK" } } },
    },
    "/api/accounts": {
      post: {
        summary: "Create a developer account + API key",
        security: [],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" } } } } },
        },
        responses: { "200": { description: "Account", content: { "application/json": { schema: { $ref: "#/components/schemas/Account" } } } }, "429": { description: "Rate limited" } },
      },
      get: { summary: "Get the authenticated account", responses: { "200": { description: "Account" }, "401": { description: "Unauthorized" } } },
    },
    "/api/account/rotate-key": {
      post: { summary: "Rotate the API key (old key invalidated immediately)", responses: { "200": { description: "New key" }, "401": { description: "Unauthorized" } } },
    },
    "/api/account/usage": {
      get: { summary: "Recent metered calls for the account", responses: { "200": { description: "Usage list" }, "401": { description: "Unauthorized" } } },
    },
    "/api/account/upgrade": {
      post: { summary: "Start a Pro upgrade (returns a payment to settle on-chain)", responses: { "200": { description: "Payment handle" }, "401": { description: "Unauthorized" } } },
    },
    "/api/account/upgrade/{orderId}/status": {
      get: {
        summary: "Poll an upgrade payment; flips to Pro on settlement",
        parameters: [{ name: "orderId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Upgrade status" } },
      },
    },
    "/api/credits/topup": {
      post: {
        summary: "Buy prepaid credits (returns a Solana Pay URL)",
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { amount: { type: "string", example: "5.00" } } } } } },
        responses: { "200": { description: "Top-up handle" }, "401": { description: "Unauthorized" } },
      },
    },
    "/api/credits/{orderId}/status": {
      get: {
        summary: "Poll a top-up; credits the balance on settlement",
        parameters: [{ name: "orderId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Top-up status" } },
      },
    },
    "/api/tools": {
      get: {
        summary: "Discover the tool catalog (agent-readable)",
        security: [],
        responses: { "200": { description: "Tools", content: { "application/json": { schema: { type: "object", properties: { tools: { type: "array", items: { $ref: "#/components/schemas/Tool" } } } } } } } },
      },
    },
    "/api/tools/{slug}/invoke": {
      post: {
        summary: "Invoke a tool (metered). Pay via credits (API key) or x402.",
        description:
          "With an API key: draws the per-call price from your balance (exactly-once via the " +
          "`Idempotency-Key` header). Without an API key: returns 402 with a payment challenge; pay " +
          "on-chain and retry with `X-Payment-Reference: <reference>`.",
        parameters: [
          { name: "slug", in: "path", required: true, schema: { type: "string" } },
          { name: "Idempotency-Key", in: "header", required: false, schema: { type: "string" } },
          { name: "X-Payment-Reference", in: "header", required: false, schema: { type: "string" }, description: "x402: the settled payment reference to redeem." },
        ],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { input: { type: "object" } } } } } },
        responses: {
          "200": { description: "Tool output" },
          "400": { description: "Bad input" },
          "402": { description: "Payment required (x402 challenge)", content: { "application/json": { schema: { $ref: "#/components/schemas/PaymentChallenge" } } } },
          "404": { description: "Tool not found" },
          "429": { description: "Rate limited" },
        },
      },
    },
    "/api/checkout": {
      post: {
        summary: "Create a payment link / invoice (admin)",
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { rail: { type: "string", example: "USDC" }, amount: { type: "string", example: "12.50" }, message: { type: "string" } } } } } },
        responses: { "200": { description: "Invoice + Solana Pay URL" }, "400": { description: "Invalid" } },
      },
    },
    "/api/invoice/{id}/status": {
      get: {
        summary: "Poll an invoice's payment status",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Invoice status" }, "404": { description: "Not found" } },
      },
    },
    "/api/contact": {
      post: {
        summary: "Send a contact message",
        security: [],
        requestBody: { content: { "application/json": { schema: { type: "object", required: ["name", "email", "message"], properties: { name: { type: "string" }, email: { type: "string" }, subject: { type: "string" }, message: { type: "string" } } } } } },
        responses: { "200": { description: "Sent" }, "400": { description: "Invalid" }, "429": { description: "Rate limited" } },
      },
    },
  },
} as const;

export function GET() {
  return NextResponse.json(spec);
}
