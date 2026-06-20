import Link from "next/link";
import { discoveryView } from "@/lib/spine/catalog";

export const dynamic = "force-dynamic";

type ProductTool = {
  slug: string;
  name: string;
  description: string;
  price_usd: string;
  price_micros: number;
  input: Record<string, string>;
  invoke: string;
};

function normalizeTool(raw: Record<string, unknown>): ProductTool {
  return {
    slug: String(raw.slug ?? ""),
    name: String(raw.name ?? ""),
    description: String(raw.description ?? ""),
    price_usd: String(raw.price_usd ?? "0"),
    price_micros: Number(raw.price_micros ?? 0),
    input: isInputShape(raw.input) ? raw.input : {},
    invoke: String(raw.invoke ?? ""),
  };
}

function isInputShape(value: unknown): value is Record<string, string> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function displayPrice(priceUsd: string): string {
  const value = Number(priceUsd);
  if (!Number.isFinite(value)) return "$0.00";
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(4)}`;
}

function productLabel(slug: string): string {
  if (slug.includes("growth")) return "Growth";
  if (slug.includes("ai")) return "AI";
  if (slug.includes("qr") || slug.includes("uuid") || slug.includes("sha") || slug.includes("slug")) return "Utility";
  return "Tool";
}

export default function ProductsPage() {
  const tools = discoveryView().map(normalizeTool);
  const paidServices = tools.filter((tool) => tool.price_micros >= 1_000_000).length;

  return (
    <main>
      <section className="catalog-hero">
        <div className="catalog-copy">
          <span className="pill">Public catalog</span>
          <h1 className="hero-h1">Products agents can buy by the call.</h1>
          <p className="hero-sub">
            Every listing below is discoverable by API, metered exactly once, and billable through SolTip credits or the x402 payment flow.
          </p>
          <div className="hero-cta">
            <Link href="/developers"><button>Run a tool</button></Link>
            <Link href="/docs"><button className="secondary">API docs</button></Link>
          </div>
        </div>
        <aside className="catalog-ledger" aria-label="Catalog summary">
          <div className="kv"><span>Live tools</span><span>{tools.length}</span></div>
          <div className="kv"><span>Service packs</span><span>{paidServices}</span></div>
          <div className="kv"><span>Billing</span><span>Per call</span></div>
          <div className="kv"><span>Discovery</span><span><code>/api/tools</code></span></div>
        </aside>
      </section>

      <section className="sec-head" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <span className="num">Catalog / {tools.length} listings</span>
        <h2>Available tools</h2>
        <p>Use these as products, API endpoints, or agent-callable capabilities. The fintech growth audit pack is the first service-style listing.</p>
      </section>

      <section className="product-grid">
        {tools.map((tool) => {
          const inputs = Object.entries(tool.input);
          return (
            <article className="product-card" key={tool.slug}>
              <div className="product-meta">
                <span>{productLabel(tool.slug)}</span>
                <strong>{displayPrice(tool.price_usd)} / call</strong>
              </div>
              <h2>{tool.name}</h2>
              <p>{tool.description}</p>
              <div className="product-inputs">
                <span>Inputs</span>
                {inputs.length ? (
                  inputs.slice(0, 5).map(([key, shape]) => (
                    <code key={key}>{key}: {shape}</code>
                  ))
                ) : (
                  <code>No input required</code>
                )}
              </div>
              <div className="product-actions">
                <Link href="/developers"><button>Try in console</button></Link>
                <code>{tool.invoke}</code>
              </div>
            </article>
          );
        })}
      </section>

      <section className="catalog-note">
        <div>
          <span className="num">For larger service work</span>
          <h2>List the paid intake first.</h2>
          <p>
            A request like fintech UGC ads or funnel optimization can start as a billable audit pack here. Full creator production, milestones, approvals, and payouts should be a separate marketplace workflow on top of the same ledger.
          </p>
        </div>
        <Link href="/contact"><button className="secondary">List a tool</button></Link>
      </section>
    </main>
  );
}
