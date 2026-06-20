// posts.ts — read blog posts from markdown files in content/blog. Posts are written by the agentic
// pipeline (src/lib/blog/generate.ts) or by hand. Frontmatter is a small YAML-ish block.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { marked } from "marked";

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  author: string;
  tags: string[];
  reviewed: boolean; // editorial guardrail: AI drafts are false until a human approves
}

export interface Post extends PostMeta {
  html: string;
  markdown: string;
}

const BLOG_DIR = join(process.cwd(), "content", "blog");

// Minimal frontmatter parser: a leading `---` block of `key: value` lines.
function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body: m[2] };
}

function toMeta(slug: string, meta: Record<string, string>): PostMeta {
  return {
    slug,
    title: meta.title || slug,
    description: meta.description || "",
    date: meta.date || new Date().toISOString().slice(0, 10),
    author: meta.author || "SolTip",
    tags: (meta.tags || "").split(",").map((t) => t.trim()).filter(Boolean),
    reviewed: String(meta.reviewed).toLowerCase() === "true",
  };
}

export function listPosts(): PostMeta[] {
  if (!existsSync(BLOG_DIR)) return [];
  return readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const slug = f.replace(/\.md$/, "");
      const { meta } = parseFrontmatter(readFileSync(join(BLOG_DIR, f), "utf8"));
      return toMeta(slug, meta);
    })
    // Only show human-reviewed posts publicly (guardrail against raw AI spam).
    .filter((p) => p.reviewed)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(slug: string): Post | null {
  const file = join(BLOG_DIR, `${slug}.md`);
  if (!existsSync(file)) return null;
  const { meta, body } = parseFrontmatter(readFileSync(file, "utf8"));
  const m = toMeta(slug, meta);
  if (!m.reviewed) return null;
  return { ...m, markdown: body, html: marked.parse(body, { async: false }) as string };
}
