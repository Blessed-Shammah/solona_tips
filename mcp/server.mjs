#!/usr/bin/env node
// SolTip MCP server — exposes the platform's tool catalog to ANY MCP-capable AI agent
// (Claude Desktop, Claude Code, etc.). The agent discovers tools dynamically from the live catalog
// and calls them; the server bills each call through the platform (API key + prepaid credits).
// When unfunded, it surfaces the x402 payment challenge so the agent/user knows how to pay.
//
// This is the "AI agents can use AND pay for tools" story, made real over the MCP standard.
//
// Run:  SOLTIP_BASE_URL=http://localhost:3000 SOLTIP_API_KEY=sk_live_... node mcp/server.mjs
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const BASE_URL = (process.env.SOLTIP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const API_KEY = process.env.SOLTIP_API_KEY || "";

function authHeaders(extra = {}) {
  const h = { "content-type": "application/json", ...extra };
  if (API_KEY) h["authorization"] = `Bearer ${API_KEY}`;
  return h;
}

async function fetchCatalog() {
  const res = await fetch(`${BASE_URL}/api/tools`);
  if (!res.ok) throw new Error(`catalog fetch failed: ${res.status}`);
  const { tools } = await res.json();
  return tools || [];
}

// Map a catalog tool's lightweight input hint to a permissive JSON Schema.
function inputSchemaFor(tool) {
  const properties = {};
  for (const [key, hint] of Object.entries(tool.input || {})) {
    const isNumber = String(hint).toLowerCase().includes("number");
    properties[key] = { type: isNumber ? "number" : "string", description: String(hint) };
  }
  return { type: "object", properties, additionalProperties: true };
}

const server = new Server(
  { name: "soltip-tools", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const catalog = await fetchCatalog();
  return {
    tools: catalog.map((t) => ({
      name: t.slug,
      description: `${t.description} (costs $${t.price_usd}/call, billed via SolTip)`,
      inputSchema: inputSchemaFor(t),
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const slug = req.params.name;
  const input = req.params.arguments || {};
  // Idempotency key so retries never double-charge (exactly-once on the platform side).
  const callId = `mcp-${slug}-${JSON.stringify(input)}`.slice(0, 200);

  const res = await fetch(`${BASE_URL}/api/tools/${slug}/invoke`, {
    method: "POST",
    headers: authHeaders({ "idempotency-key": callId }),
    body: JSON.stringify({ input }),
  });
  const data = await res.json();

  // Payment required → surface the x402 challenge clearly (agent/user can fund and retry).
  if (res.status === 402) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text:
            `💳 Payment required for "${slug}" ($${data.price_usd}).\n` +
            (data.pay_uri ? `Pay: ${data.pay_uri}\nReference: ${data.reference}\n` : "") +
            `Fund your SolTip balance at ${BASE_URL}/developers, then retry.`,
        },
      ],
    };
  }
  if (!res.ok || data.error) {
    return { isError: true, content: [{ type: "text", text: `Error: ${data.error || res.status}` }] };
  }

  return {
    content: [
      {
        type: "text",
        text:
          `✅ ${slug} (charged $${data.cost_usd}${data.replay ? ", cached/replay — not re-charged" : ""}):\n` +
          JSON.stringify(data.output, null, 2),
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`SolTip MCP server connected — catalog at ${BASE_URL}, ${API_KEY ? "authenticated" : "NO API KEY (x402 challenges only)"}`);
