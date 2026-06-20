// Blog post page. Renders markdown → HTML (server-side). Reviewed posts only.
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost, listPosts } from "@/lib/blog/posts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.title,
    description: post.description,
    openGraph: { title: post.title, description: post.description, type: "article" },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const more = listPosts().filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <main className="wrap">
      <p className="muted" style={{ fontSize: 13 }}>
        <Link href="/blog">← Blog</Link> · {post.date} · {post.author}
      </p>

      <article className="prose card">
        <div dangerouslySetInnerHTML={{ __html: post.html }} />
      </article>

      {more.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 className="muted" style={{ fontSize: 14 }}>More reading</h3>
          {more.map((p) => (
            <div className="kv" key={p.slug}>
              <Link href={`/blog/${p.slug}`}>{p.title}</Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
