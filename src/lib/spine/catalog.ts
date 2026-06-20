// catalog.ts — built-in tools + their handlers. Each is a real, dependency-light service an AI
// agent (or app) might call and pay per use. Handlers are pure-ish functions: (input) -> output.
// New tools snap in here; they inherit metering, billing, and the agent interface for free.
import { createHash, randomUUID } from "node:crypto";
import QRCode from "qrcode";
import type { LanguageModel } from "ai";
import { upsertTool, listTools, type Tool } from "./store";

export interface ToolSpec {
  slug: string;
  name: string;
  description: string;
  priceMicros: number; // price per call in USDC micros (1_000_000 = $1)
  /** JSON-shape hint advertised to agents in tool discovery. */
  input: Record<string, string>;
  handler: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

function str(input: Record<string, unknown>, key: string, fallback?: string): string {
  const v = input[key];
  if (typeof v === "string") return v;
  if (v == null && fallback !== undefined) return fallback;
  throw new Error(`field "${key}" must be a string`);
}

export const BUILTIN_TOOLS: ToolSpec[] = [
  {
    slug: "uuid",
    name: "UUID Generator",
    description: "Generate one or more RFC-4122 UUIDs.",
    priceMicros: 1_000, // $0.001
    input: { count: "number (1-100, optional)" },
    async handler(input) {
      const n = Math.min(Math.max(Number(input.count ?? 1) || 1, 1), 100);
      return { uuids: Array.from({ length: n }, () => randomUUID()) };
    },
  },
  {
    slug: "sha256",
    name: "SHA-256 Hash",
    description: "Hash input text with SHA-256 (hex).",
    priceMicros: 500, // $0.0005
    input: { text: "string" },
    async handler(input) {
      const text = str(input, "text");
      return { algo: "sha256", hex: createHash("sha256").update(text).digest("hex") };
    },
  },
  {
    slug: "qr",
    name: "QR Code Generator",
    description: "Render any text/URL as a PNG QR code (data URL).",
    priceMicros: 2_000, // $0.002
    input: { data: "string" },
    async handler(input) {
      const data = str(input, "data");
      const dataUrl = await QRCode.toDataURL(data, { margin: 1, width: 256 });
      return { dataUrl };
    },
  },
  {
    slug: "slugify",
    name: "Slugify",
    description: "Turn a title into a URL-safe slug.",
    priceMicros: 300, // $0.0003
    input: { text: "string" },
    async handler(input) {
      const slug = str(input, "text")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      return { slug };
    },
  },
  {
    // The showcase tool: an AI capability an agent pays for per call. Proves "tools snap in" —
    // it inherits metering, x402, and MCP exposure with zero extra wiring.
    slug: "ai-summarize",
    name: "AI Summarizer",
    description: "Summarize any text into concise bullet points (AI-powered).",
    priceMicros: 10_000, // $0.01
    input: { text: "string", bullets: "number (1-10, optional)" },
    async handler(input) {
      if (process.env.AI_TOOLS_ENABLED === "false") throw new Error("AI tools are disabled");
      if (!hasAiKey()) throw new Error("AI tools not configured — set AI_GATEWAY_API_KEY");
      const text = str(input, "text");
      if (text.length < 20) throw new Error("text too short to summarize");
      const bullets = Math.min(Math.max(Number(input.bullets ?? 5) || 5, 1), 10);
      const model = await resolveToolModel();
      const { generateText } = await import("ai");
      const { text: summary } = await generateText({
        model,
        prompt: `Summarize the following into exactly ${bullets} concise, information-dense bullet points. Output only the bullets.\n\n${text.slice(0, 12_000)}`,
      });
      return { bullets, summary: summary.trim() };
    },
  },
];

function hasAiKey(): boolean {
  return !!(
    process.env.AI_GATEWAY_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY
  );
}

// Resolve a cheap/fast model from whatever LLM key is configured (any provider).
async function resolveToolModel(): Promise<LanguageModel> {
  const m = process.env.AI_TOOLS_MODEL;
  if (process.env.AI_GATEWAY_API_KEY) return m || "anthropic/claude-haiku-4-5-20251001";
  if (process.env.ANTHROPIC_API_KEY) { const { anthropic } = await import("@ai-sdk/anthropic"); return anthropic(m || "claude-haiku-4-5-20251001"); }
  if (process.env.OPENAI_API_KEY) { const { openai } = await import("@ai-sdk/openai"); return openai(m || "gpt-4o-mini"); }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) { const { google } = await import("@ai-sdk/google"); return google(m || "gemini-2.0-flash"); }
  throw new Error("AI tools not configured");
}

const handlers = new Map<string, ToolSpec["handler"]>(BUILTIN_TOOLS.map((t) => [t.slug, t.handler]));

export function runHandler(slug: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const h = handlers.get(slug);
  if (!h) throw new Error(`no handler for tool "${slug}"`);
  return h(input);
}

/** Seed the built-in tools into the catalog (idempotent). Call once at startup. */
export function seedBuiltinTools(): void {
  for (const t of BUILTIN_TOOLS) {
    upsertTool({
      id: `builtin:${t.slug}`,
      account_id: null,
      slug: t.slug,
      name: t.name,
      description: t.description,
      price_micros: t.priceMicros,
      handler: t.slug,
    });
  }
}

// Self-seed on import so the catalog is always populated wherever it's used (idempotent upsert).
seedBuiltinTools();

export function inputShapeFor(slug: string): Record<string, string> {
  return BUILTIN_TOOLS.find((t) => t.slug === slug)?.input ?? {};
}

/** Agent-facing discovery view of the catalog. */
export function discoveryView(): Array<Record<string, unknown>> {
  return listTools().map((t: Tool) => ({
    slug: t.slug,
    name: t.name,
    description: t.description,
    price_usd: (t.price_micros / 1_000_000).toFixed(6),
    price_micros: t.price_micros,
    input: inputShapeFor(t.slug),
    invoke: `/api/tools/${t.slug}/invoke`,
  }));
}
