// API docs — human reference in the design system. The machine-readable contract is /api/openapi.json.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Docs",
  description: "SolTip API reference — accounts, credits, agent-payable tools, the x402 flow, and MCP.",
};

const endpoints: [string, string, string][] = [
  ["POST", "/api/accounts", "Create a developer account + API key"],
  ["GET", "/api/accounts", "Get the authenticated account"],
  ["POST", "/api/account/rotate-key", "Rotate the API key (old key dies)"],
  ["GET", "/api/account/usage", "Recent metered calls"],
  ["POST", "/api/account/upgrade", "Start a Pro upgrade (returns a payment)"],
  ["POST", "/api/credits/topup", "Buy prepaid credits (Solana Pay URL)"],
  ["GET", "/api/credits/{orderId}/status", "Poll a top-up; credits balance"],
  ["GET", "/api/tools", "Discover the tool catalog"],
  ["POST", "/api/tools/{slug}/invoke", "Invoke a tool (credits or x402)"],
  ["POST", "/api/checkout", "Create a payment link / invoice"],
  ["GET", "/api/invoice/{id}/status", "Poll an invoice's status"],
];

function Code({ children }: { children: string }) {
  return (
    <pre style={{ background: "#0A0A0A", color: "#E5E5E0", border: "1px solid #0A0A0A", boxShadow: "var(--shadow-hard-sm)", padding: 16, overflow: "auto", fontSize: 12, fontFamily: "var(--font-mono)", margin: "12px 0" }}>
      {children}
    </pre>
  );
}

export default function DocsPage() {
  return (
    <main className="wrap" style={{ maxWidth: 880 }}>
      <p className="tag" style={{ marginTop: 24 }}>
        SolTip API reference. Machine-readable spec: <a href="/api/openapi.json">/api/openapi.json</a> (OpenAPI 3.1).
      </p>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)", textTransform: "uppercase" }}>Quickstart</h2>
        <p className="muted">From zero to a paid tool call in three requests.</p>
        <Code>{`# 1. Create an account → get an API key
curl -X POST https://YOUR_HOST/api/accounts \\
  -H 'content-type: application/json' -d '{"name":"My App"}'
# → { "id": "...", "api_key": "sk_live_...", "plan": "free" }

# 2. Top up credits (returns a Solana Pay URL to fund the balance)
curl -X POST https://YOUR_HOST/api/credits/topup \\
  -H 'authorization: Bearer sk_live_...' \\
  -H 'content-type: application/json' -d '{"amount":"5.00"}'

# 3. Call a tool (charged from your balance, exactly-once)
curl -X POST https://YOUR_HOST/api/tools/uuid/invoke \\
  -H 'authorization: Bearer sk_live_...' \\
  -H 'idempotency-key: my-unique-id' \\
  -H 'content-type: application/json' -d '{"input":{"count":2}}'`}</Code>
      </section>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)", textTransform: "uppercase" }}>Authentication</h2>
        <p className="muted">Pass your API key as a bearer token (or <code>X-API-Key</code>). Keys start with <code>sk_live_</code>.</p>
        <Code>{`Authorization: Bearer sk_live_xxxxxxxxxxxxxxxxxxxxxxxx`}</Code>
        <p className="muted">Idempotency: send a stable <code>Idempotency-Key</code> on tool calls so retries never double-charge.</p>
      </section>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)", textTransform: "uppercase" }}>x402 — autonomous agent payments</h2>
        <p className="muted">No API key? An agent can pay per call with no account:</p>
        <ol className="steps" style={{ marginTop: 8 }}>
          <li><b>Call the tool</b> with no payment → you get <code>402</code> + a payment challenge (price, rail, <code>reference</code>, <code>pay_uri</code>).</li>
          <li><b>Pay the <code>pay_uri</code></b> on-chain (any Solana Pay wallet/agent).</li>
          <li><b>Retry</b> the same call with <code>X-Payment-Reference: &lt;reference&gt;</code> → settlement is verified and the tool runs.</li>
        </ol>
        <Code>{`# Step 1 — no payment → 402 with a challenge
curl -i -X POST https://YOUR_HOST/api/tools/qr/invoke \\
  -d '{"input":{"data":"hello"}}'
# HTTP/1.1 402 Payment Required
# { "error":"payment_required","pay_uri":"solana:...","reference":"<ref>" }

# Step 2/3 — pay on-chain, then redeem
curl -X POST https://YOUR_HOST/api/tools/qr/invoke \\
  -H 'x-payment-reference: <ref>' \\
  -d '{"input":{"data":"hello"}}'`}</Code>
      </section>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)", textTransform: "uppercase" }}>MCP — connect an AI agent</h2>
        <p className="muted">Every tool is exposed over the Model Context Protocol. Point Claude/any MCP client at the server:</p>
        <Code>{`{
  "mcpServers": {
    "soltip-tools": {
      "command": "node",
      "args": ["/path/to/mcp/server.mjs"],
      "env": { "SOLTIP_BASE_URL": "https://YOUR_HOST", "SOLTIP_API_KEY": "sk_live_..." }
    }
  }
}`}</Code>
        <p className="muted">With a funded key, calls draw from credits; without one, the agent gets x402 challenges.</p>
      </section>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)", textTransform: "uppercase" }}>Endpoints</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 8 }}>
          <thead><tr>
            <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--ink)", fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase" }}>Method</th>
            <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--ink)", fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase" }}>Path</th>
            <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--ink)", fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase" }}>Description</th>
          </tr></thead>
          <tbody>
            {endpoints.map(([m, p, d]) => (
              <tr key={p + m}>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--grid)", fontFamily: "var(--font-mono)", color: m === "GET" ? "var(--green-text)" : "var(--indigo)", fontWeight: 700 }}>{m}</td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--grid)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{p}</td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--grid)", color: "var(--muted)" }}>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)", textTransform: "uppercase" }}>Errors &amp; limits</h2>
        <div className="kv"><span>400</span><span>Bad input — not charged</span></div>
        <div className="kv"><span>401</span><span>Missing/invalid API key</span></div>
        <div className="kv"><span>402</span><span>Payment required (x402 challenge)</span></div>
        <div className="kv"><span>404</span><span>Tool / resource not found</span></div>
        <div className="kv"><span>429</span><span>Rate limited (120 tool calls/min, 10 signups/hr per IP)</span></div>
        <p className="muted" style={{ marginTop: 14 }}>Every successful tool call is metered exactly-once. Underpaid/double-paid amounts are flagged for refund, never silently kept.</p>
      </section>
    </main>
  );
}
