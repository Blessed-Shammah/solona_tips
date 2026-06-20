// Company landing — "The Verifiable Ledger" brutalist system (Swiss grid, hard shadows, Syne
// display, the Living Receipt Tape motif). Light, sharp, structural.
import Link from "next/link";
import { config } from "@/lib/config";
import ReceiptTape from "@/components/ReceiptTape";

export default function Landing() {
  return (
    <main>
      {/* Hero — split ledger */}
      <section className="hero">
        <div className="hero-left">
          <span className={`pill ${config.cluster}`}><span className="dot" />SOL_{config.cluster.toUpperCase()}</span>
          <h1 className="hero-h1">Capital for<br />the <span className="grad">Machine</span><br />Age.</h1>
          <p className="hero-sub">
            Discover, use, and pay for premium software tools per call. Non-custodial payment rails
            built explicitly for AI agents — and the developers who arm them.
          </p>
          <div className="hero-cta">
            <Link href="/products"><button style={{ maxWidth: 220 }}>Browse products</button></Link>
            <Link href="/developers"><button className="secondary" style={{ maxWidth: 220 }}>Read the docs</button></Link>
            <span className="hero-live"><span className="dot" />Live on {config.cluster}</span>
          </div>
        </div>

        {/* The Living Receipt Tape (JS-driven auto-scroll) */}
        <ReceiptTape />
      </section>

      {/* Features as ledger cells */}
      <div className="sec-head" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <span className="num">01 / The Spine</span>
        <h2>One ledger. Many tools, many rails.</h2>
        <p>Add a capability and it’s instantly payable, meterable, and agent-callable — verified on-chain.</p>
      </div>
      <section className="cells">
        {[
          ["🔌", "Agent-payable tools", "By API key with prepaid credits, or pay-per-call via x402. Metered, exactly-once.", "/products", "Browse tools"],
          ["🧩", "MCP-native", "Every tool exposed over the Model Context Protocol. Claude and any agent can call it.", "/developers", "Connect"],
          ["💸", "Rail-agnostic", "Solana today; cards, chains, bank rails behind one interface. Non-custodial.", "/links", "Payment links"],
          ["🔒", "Exactly-once", "Double-pays and replays can’t double-charge — enforced by the database.", "/blog", "How"],
          ["⚡", "Instant & global", "Settle in seconds, no chargebacks, network fees under a cent.", "/pricing", "Pricing"],
          ["📈", "Built to scale", "Free to start, Pro for volume, a catalog you can open to builders.", "/pricing", "Plans"],
        ].map(([ico, h, p, href, cta]) => (
          <div className="cell" key={h}>
            <div className="ico">{ico}</div>
            <h3>{h}</h3>
            <p>{p}</p>
            <Link href={href}>{cta} →</Link>
          </div>
        ))}
      </section>

      {/* Stats strip */}
      <section className="stats">
        <div className="stat"><div className="num">&lt;1¢</div><div className="lbl">Fee per payment</div></div>
        <div className="stat"><div className="num">4+</div><div className="lbl">Rails designed-in</div></div>
        <div className="stat"><div className="num">0%</div><div className="lbl">Custody</div></div>
        <div className="stat"><div className="num">100%</div><div className="lbl">On-chain verified</div></div>
      </section>

      {/* How it's used */}
      <div className="sec-head" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <span className="num">02 / How it’s used</span>
        <h2>Two front doors. One spine.</h2>
      </div>
      <section className="how">
        <div className="how-col">
          <span className="how-tag">Businesses &amp; creators</span>
          <h3>Get paid in minutes</h3>
          <ol className="steps">
            <li><b>Create a link</b> — pick a currency + amount.</li>
            <li><b>Share the QR / link</b> — invoice, bio, checkout.</li>
            <li><b>They pay in their wallet</b> — Phantom, Solflare, any Solana Pay app.</li>
            <li><b>Funds hit your wallet</b> — confirmed on-chain, you keep custody.</li>
          </ol>
          <Link href="/links"><button style={{ maxWidth: 220 }}>Create a payment link</button></Link>
        </div>
        <div className="how-col" style={{ borderRight: "none" }}>
          <span className="how-tag alt">Developers &amp; AI agents</span>
          <h3>Build &amp; monetize tools</h3>
          <ol className="steps">
            <li><b>Get an API key</b> + top up credits (or use x402 pay-per-call).</li>
            <li><b>Discover tools</b> via <code>/api/tools</code> or MCP.</li>
            <li><b>Call &amp; pay per use</b> — metered, exactly-once, verified.</li>
            <li><b>Agents pay autonomously</b> — a 402 challenge they settle and retry.</li>
          </ol>
          <Link href="/developers"><button className="secondary" style={{ maxWidth: 220 }}>Open the console</button></Link>
        </div>
      </section>

      {/* FAQ */}
      <div className="sec-head" style={{ maxWidth: 820, margin: "0 auto" }}>
        <span className="num">03 / FAQ</span>
        <h2>Questions</h2>
      </div>
      <section className="faq">
        {[
          ["Is it custodial — do you hold my money?", "No. Funds settle straight to your wallet on-chain. The app only verifies payments; it never holds keys or balances."],
          ["What can customers pay with?", "USDC, USDG, PYUSD, or SOL today, chosen per link. The architecture is rail-agnostic — cards and bank rails plug in behind the same interface."],
          ["What is x402 / “agents paying”?", "An open pattern where a tool returns HTTP 402 with a payment challenge; an AI agent pays on-chain and retries. No human in the loop."],
          ["How are you cheaper than cards?", "No card interchange and no custody overhead. A $1,000 charge costs ~$32 on cards vs. a fraction of a cent in network fees here."],
        ].map(([q, a]) => (
          <details key={q} className="faq-item">
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>

      {/* CTA */}
      <section className="cta-band">
        <h2>Deploy the protocol</h2>
        <p className="muted">Get an API key in one click, or create your first payment link.</p>
        <div className="hero-cta">
          <Link href="/developers"><button style={{ maxWidth: 220, boxShadow: "3px 3px 0 0 #00E57A" }}>Get your API key</button></Link>
          <Link href="/links"><button className="secondary" style={{ maxWidth: 180 }}>Create a link</button></Link>
        </div>
      </section>
    </main>
  );
}
