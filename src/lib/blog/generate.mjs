// generate.mjs — the agentic, research-style blog writer. Two passes:
//   1) RESEARCH: plan the article, enumerate key claims, and self-assess confidence + sources.
//   2) WRITE: draft the article from the plan, with the editorial guardrails baked in.
// Output is written to content/blog/<slug>.md with `reviewed: false` — a human flips it to true
// after a fact-check. This is what keeps the blog an SEO asset and not penalizable AI spam.
//
// Requires an AI key — set AI_GATEWAY_API_KEY (recommended; routes any model through Vercel AI
// Gateway). Model via BLOG_MODEL, default a current Claude.
import { generateText } from "ai";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const BLOG_DIR = join(process.cwd(), "content", "blog");

/**
 * Resolve a model from WHATEVER key is configured — any LLM, any key:
 *  - AI_GATEWAY_API_KEY            → any model via "provider/model" string (recommended)
 *  - ANTHROPIC_API_KEY            → @ai-sdk/anthropic
 *  - OPENAI_API_KEY               → @ai-sdk/openai
 *  - GOOGLE_GENERATIVE_AI_API_KEY → @ai-sdk/google
 * Override the model with BLOG_MODEL.
 */
async function resolveModel() {
  const m = process.env.BLOG_MODEL;
  if (process.env.AI_GATEWAY_API_KEY) return m || "anthropic/claude-sonnet-4-6";
  if (process.env.ANTHROPIC_API_KEY) { const { anthropic } = await import("@ai-sdk/anthropic"); return anthropic(m || "claude-sonnet-4-6"); }
  if (process.env.OPENAI_API_KEY) { const { openai } = await import("@ai-sdk/openai"); return openai(m || "gpt-4o"); }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) { const { google } = await import("@ai-sdk/google"); return google(m || "gemini-2.0-flash"); }
  return null;
}

const RESEARCH_SYSTEM = `You are a sharp research analyst for a company building agent-economy payment
infrastructure. You plan articles that are genuinely useful and accurate. You never invent specific
numbers, dates, or APIs. For every factual claim you list, you state how confident you are and what
source would back it. Brevity and specificity over fluff.`;

const WRITER_SYSTEM = `You are an expert technical writer. You write original, high-signal articles
with real expertise (E-E-A-T). Hard rules:
- Add real value and a clear angle; never thin rewrites of existing pages.
- Cite sources you are confident about, with links. If you are unsure of a fact, FLAG it ("verify:")
  rather than inventing specifics.
- Clear structure: short intro, H2 sections, a strong takeaway, and a "Sources" list at the end.
- Brand voice: credible, direct, no hype.
Output ONLY Markdown (no frontmatter — it will be added).`;

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
}

export async function generatePost(topic) {
  if (!topic || !topic.trim()) throw new Error("topic is required");
  const model = await resolveModel();
  if (!model) {
    throw new Error(
      "No AI key found. Set one of: AI_GATEWAY_API_KEY (recommended, any model) · ANTHROPIC_API_KEY · OPENAI_API_KEY · GOOGLE_GENERATIVE_AI_API_KEY.",
    );
  }

  // Pass 1 — agentic research/plan.
  const { text: plan } = await generateText({
    model,
    system: RESEARCH_SYSTEM,
    prompt:
      `Plan a deeply useful article on: "${topic}".\n` +
      `Output:\n- a target SEO keyword\n- a one-line angle (why this is worth reading)\n` +
      `- an outline of 4-6 H2 sections\n- the key factual claims, each with a confidence note and a likely source.`,
  });

  // Pass 2 — draft from the plan, guardrails enforced.
  const { text: article } = await generateText({
    model,
    system: WRITER_SYSTEM,
    prompt:
      `Write the full article in Markdown using this research plan. Start with an H1 title.\n\n` +
      `RESEARCH PLAN:\n${plan}\n\nTopic: "${topic}"`,
  });

  // Derive a title from the first H1, else from the topic.
  const titleMatch = article.match(/^#\s+(.+)$/m);
  const title = (titleMatch ? titleMatch[1] : topic).replace(/"/g, "'").trim();
  const description = `${title} — research from SolTip on the agent economy and on-chain payments.`;
  const slug = slugify(title);
  const date = new Date().toISOString().slice(0, 10);

  const frontmatter =
    `---\n` +
    `title: "${title}"\n` +
    `description: "${description.replace(/"/g, "'")}"\n` +
    `date: ${date}\n` +
    `author: SolTip Research (AI draft)\n` +
    `tags: agent economy, payments\n` +
    `reviewed: false\n` + // ← human must verify + flip to true before it publishes
    `---\n\n`;

  if (!existsSync(BLOG_DIR)) mkdirSync(BLOG_DIR, { recursive: true });
  const path = join(BLOG_DIR, `${slug}.md`);
  writeFileSync(path, frontmatter + article.trim() + "\n");
  return { slug, path, title };
}
