// Minimal MCP client that spawns the SolTip MCP server and exercises it end-to-end.
// Proves discovery (tools/list) and invocation (tools/call) work over the real MCP protocol.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["mcp/server.mjs"],
  env: { ...process.env }, // carries SOLTIP_BASE_URL / SOLTIP_API_KEY through to the server
});

const client = new Client({ name: "soltip-test-client", version: "1.0.0" }, { capabilities: {} });
await client.connect(transport);

console.log("\n=== tools/list (discovered from live catalog) ===");
const { tools } = await client.listTools();
for (const t of tools) console.log(`  • ${t.name} — ${t.description}`);

console.log("\n=== tools/call: uuid { count: 2 } ===");
const r1 = await client.callTool({ name: "uuid", arguments: { count: 2 } });
console.log(r1.content[0].text);

console.log("\n=== tools/call: sha256 { text: 'ship it' } ===");
const r2 = await client.callTool({ name: "sha256", arguments: { text: "ship it" } });
console.log(r2.content[0].text);

await client.close();
console.log("\n✓ MCP round-trip complete.");
