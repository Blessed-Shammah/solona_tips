// Pricing — the "borrow features, they pay" ladder.
import Link from "next/link";
import { FREE_DAILY_CALLS } from "@/lib/spine/meter";

const tiers = [
  {
    name: "Free",
    price: "$0",
    sub: "pay only per call",
    features: [`Up to ${FREE_DAILY_CALLS} calls/day`, "All catalog tools", "Pay-per-call credits", "x402 agent payments", "Community support"],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$29",
    sub: "/mo + per-call",
    features: ["Unlimited calls", "Higher rate limits", "Usage analytics & exports", "Multiple API keys", "Webhooks", "Priority support"],
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
    name: "Scale",
    price: "Custom",
    sub: "for platforms",
    features: ["List your own tools", "Revenue share on agent traffic", "Dedicated RPC / SLA", "Multi-rail (cards, chains, bank)", "SSO & team roles", "Solutions engineering"],
    cta: "Talk to us",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <main className="wrap">
      <p className="tag">Free to start; pay to scale. The tools are free to try — you pay for volume, control, and insight.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {tiers.map((t) => (
          <div key={t.name} className="card" style={t.highlight ? { boxShadow: "var(--shadow-indigo)", borderColor: "var(--indigo)" } : undefined}>
            <h3 style={{ margin: "0 0 4px", fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: 0 }}>{t.name}</h3>
            <div className="amount" style={{ fontSize: 32 }}>{t.price}<small>{t.sub}</small></div>
            <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", fontSize: 14 }}>
              {t.features.map((f) => <li key={f} style={{ padding: "6px 0", color: "var(--text)" }}>✓ {f}</li>)}
            </ul>
            <Link href="/developers"><button className={t.highlight ? undefined : "secondary"}>{t.cta}</button></Link>
          </div>
        ))}
      </div>

      <p className="muted" style={{ marginTop: 20 }}>
        Prices are illustrative for the prototype. The moat isn’t the price — it’s the agent-payable,
        verifiable-settlement spine every tool plugs into. <Link href="/developers">Open the console →</Link>
      </p>
    </main>
  );
}
