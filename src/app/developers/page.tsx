// Developer console — the flagship: get a key, top up credits, run agent-payable tools.
import Link from "next/link";
import { config } from "@/lib/config";
import DeveloperConsole from "@/components/DeveloperConsole";

export const dynamic = "force-dynamic";

export default function DevelopersPage() {
  return (
    <main className="wrap">
      <p className="tag">
        The agent-payable tool platform. Get an API key, fund credits, and call premium tools —
        humans or AI agents, metered and settled on-chain.{" "}
        <Link href="/pricing">Pricing →</Link>
      </p>
      <span className={`pill ${config.cluster}`} style={{ marginBottom: 16 }}><span className="dot" />{config.cluster.toUpperCase()}</span>
      <DeveloperConsole />
      <p className="muted" style={{ marginTop: 18 }}>
        Agents can also pay per-call with no account via the <strong>x402</strong> flow: call a tool,
        get a <code>402</code> with a payment challenge, pay, retry with{" "}
        <code>X-Payment-Reference</code>. See <code>/api/tools</code> for discovery.
      </p>
    </main>
  );
}
