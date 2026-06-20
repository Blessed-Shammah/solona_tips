// Blog index — the SEO engine's front page. Lists human-reviewed posts (AI-drafted or hand-written).
import Link from "next/link";
import type { Metadata } from "next";
import { listPosts } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Blog — the agent economy, payments & on-chain commerce",
  description: "Research and guides on AI agent payments, x402, MCP, stablecoins, and the future of machine commerce.",
};

export const dynamic = "force-dynamic";

export default function BlogIndex() {
  const posts = listPosts();
  return (
    <main className="wrap">
      <p className="tag">Research on the agent economy, payments, and on-chain commerce.</p>

      {posts.length === 0 ? (
        <div className="card"><p className="muted">No posts yet. Generate one with <code>npm run blog:generate -- &quot;your topic&quot;</code>.</p></div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: "none" }}>
              <article className="card" style={{ cursor: "pointer" }}>
                <div className="muted" style={{ fontSize: 12 }}>{p.date} · {p.author}</div>
                <h2 style={{ margin: "8px 0", letterSpacing: 0, color: "var(--text)" }}>{p.title}</h2>
                <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{p.description}</p>
                <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {p.tags.slice(0, 4).map((t) => <span key={t} className="pill" style={{ fontSize: 11 }}>{t}</span>)}
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
