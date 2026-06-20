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
  if (slug.includes("shopify") || slug.includes("tiktok") || slug.includes("growth")) return "Growth";
  if (slug.includes("salesforce")) return "RevOps";
  if (slug.includes("formula")) return "Ops";
  if (slug.includes("creator")) return "Creator";
  if (slug.includes("ai")) return "AI";
  if (slug.includes("qr") || slug.includes("uuid") || slug.includes("sha") || slug.includes("slug")) return "Utility";
  return "Tool";
}

function productHorizon(slug: string): string {
  if (slug.includes("salesforce") || slug.includes("creator")) return "Long term";
  if (slug.includes("formula")) return "Quick build";
  if (slug.includes("shopify") || slug.includes("tiktok") || slug.includes("growth")) return "Revenue sprint";
  if (slug.includes("ai")) return "Workflow";
  return "Utility";
}

function isUtilityTool(tool: ProductTool): boolean {
  return tool.price_micros < 1_000_000;
}

function productRank(tool: ProductTool): number {
  const order = [
    "tiktok-fintech-scale-audit",
    "shopify-payout-ugc-revamp",
    "fintech-growth-audit",
    "salesforce-revops-cleanup",
    "creator-adaptation-radar",
    "formula-ops-builder",
    "ai-summarize",
  ];
  const idx = order.indexOf(tool.slug);
  return idx >= 0 ? idx : 100 - tool.price_micros / 1_000_000;
}

function ProductCard({ tool }: { tool: ProductTool }) {
  const inputs = Object.entries(tool.input);
  return (
    <article className="product-card">
      <div className="product-meta">
        <span>{productLabel(tool.slug)} / {productHorizon(tool.slug)}</span>
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
        <div className="product-endpoint">
          <span>API</span>
          <code>{tool.invoke}</code>
        </div>
      </div>
    </article>
  );
}

export default function ProductsPage() {
  const tools = discoveryView().map(normalizeTool).sort((a, b) => productRank(a) - productRank(b));
  const premiumTools = tools.filter((tool) => !isUtilityTool(tool));
  const utilityTools = tools.filter(isUtilityTool);

  return (
    <main>
      <section className="catalog-hero">
        <div className="catalog-copy">
          <span className="pill">Public catalog</span>
          <h1 className="hero-h1">Serious tools. Paid per call.</h1>
          <p className="hero-sub">
            Productized growth, RevOps, formula, and creator strategy tools that agents can buy by the call. Each one is discoverable by API, metered exactly once, and billable through SolTip credits or x402.
          </p>
          <div className="hero-cta">
            <Link href="/developers"><button>Run a tool</button></Link>
            <Link href="/docs"><button className="secondary">API docs</button></Link>
          </div>
        </div>
        <aside className="catalog-ledger" aria-label="Catalog summary">
          <div className="kv"><span>Live tools</span><span>{tools.length}</span></div>
          <div className="kv"><span>Premium packs</span><span>{premiumTools.length}</span></div>
          <div className="kv"><span>Utility helpers</span><span>{utilityTools.length}</span></div>
          <div className="kv"><span>Billing</span><span>Per call</span></div>
          <div className="kv"><span>Discovery</span><span><code>/api/tools</code></span></div>
        </aside>
      </section>

      <section className="sec-head" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <span className="num">Premium / {premiumTools.length} listings</span>
        <h2>High-value projects</h2>
        <p>These are the serious offers: the two fintech ad/funnel requests, plus diverse packs for Salesforce, formulas, and creator adaptation.</p>
      </section>

      <section className="product-grid">
        {premiumTools.map((tool) => <ProductCard key={tool.slug} tool={tool} />)}
      </section>

      <section className="sec-head catalog-secondary" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <span className="num">Utilities / {utilityTools.length} helpers</span>
        <h2>Small helpers stay available.</h2>
        <p>These are useful for agents and developers, but they no longer lead the storefront.</p>
      </section>

      <section className="product-grid utility-grid">
        {utilityTools.map((tool) => <ProductCard key={tool.slug} tool={tool} />)}
      </section>

      <section className="catalog-note">
        <div>
          <span className="num">For larger service work</span>
          <h2>Sell the intake, then expand.</h2>
          <p>
            A request like fintech UGC ads, Salesforce cleanup, or formula automation can start as a billable tool call. Full implementation, milestones, approvals, and payouts should sit on top of the same ledger as the next marketplace layer.
          </p>
        </div>
        <Link href="/contact"><button className="secondary">List a tool</button></Link>
      </section>
    </main>
  );
}
