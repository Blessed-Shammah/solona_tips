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

function optionalStr(input: Record<string, unknown>, key: string): string {
  const v = input[key];
  return typeof v === "string" ? v.trim() : "";
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
  {
    slug: "fintech-growth-audit",
    name: "Fintech Growth Audit Pack",
    description: "Turn a fintech paid-growth brief into a UGC ad scope, mobile funnel audit plan, and client-ready response.",
    priceMicros: 29_000_000, // $29
    input: {
      brief: "string (client/project post)",
      product: "string (optional)",
      channel: "string (Meta, TikTok, paid social, optional)",
      budget: "string (optional)",
      deadline: "string (optional)",
      proof_url: "string (optional sample/case study URL)",
    },
    async handler(input) {
      const brief = str(input, "brief");
      if (brief.length < 40) throw new Error("brief must include the product, channel, problem, and desired outcome");
      const product = optionalStr(input, "product") || inferProduct(brief);
      const channel = optionalStr(input, "channel") || inferChannel(brief);
      const budget = optionalStr(input, "budget") || inferBudget(brief);
      const deadline = optionalStr(input, "deadline") || inferDeadline(brief);
      const proofUrl = optionalStr(input, "proof_url");

      return {
        fit: "strong_if_fintech_growth_experience_is_available",
        product,
        channel,
        budget,
        deadline,
        recommended_listing: {
          title: "Fintech UGC Creative + Mobile Funnel Audit",
          billable_under_platform: true,
          billing_model: "Charge the audit/strategy pack as a tool call or prepaid credit order; use a separate milestone workflow for full human production.",
          suggested_price_usd: budget.includes("5k") || budget.includes("3-5") ? "3500-5000" : "2000-3000",
        },
        scope: [
          "Audit current paid-social creatives, hook retention, offer clarity, and mobile signup path.",
          "Rewrite 3-4 UGC-style ad scripts with fintech trust framing, compliance-safe claims, and creator shot notes.",
          "Map mobile landing-page friction from ad click to signup or demo request.",
          "Return a launch checklist with tracking, creative testing matrix, and first-week decision rules.",
        ],
        deliverables: [
          "Creative audit scorecard",
          "3-4 UGC video scripts",
          "Mobile funnel teardown",
          "Experiment plan for Meta or TikTok",
          proofUrl ? `Case-study/sample link to attach: ${proofUrl}` : "One relevant fintech performance sample or case study",
        ],
        intake_questions: [
          "What is the current CAC, signup conversion rate, and target ROAS/payback period?",
          "Which event is optimized in-platform today: signup, KYC start, activation, or purchase?",
          "Can we see the top three winning and losing creatives with spend and CPA?",
          "Are there compliance phrases or claims we must avoid?",
        ],
        response_template: `I can help with this as a fintech paid-growth audit: creative teardown, 3-4 UGC scripts, and mobile signup-flow fixes for ${channel}. I would start with your current ads, landing page, funnel events, and one performance export, then return a testing plan before the ${deadline} cycle. ${proofUrl ? `Relevant sample: ${proofUrl}` : "I can share a relevant fintech sample/case study."}`,
        risks: [
          "Fintech ads need claim discipline; avoid guaranteed ROAS or payout-speed claims unless substantiated.",
          "TikTok volatility usually means creative volume and hooks matter more than minor media-buying tweaks.",
          "If tracking events are wrong, creative changes may look worse than they are.",
        ],
      };
    },
  },
  {
    slug: "shopify-payout-ugc-revamp",
    name: "Shopify Payout UGC Revamp",
    description: "Scope 3-4 UGC-style ad concepts and a mobile funnel fix list for Shopify merchant payout tools.",
    priceMicros: 49_000_000, // $49
    input: {
      brief: "string (project post or client request)",
      product: "string (optional)",
      offer: "string (optional)",
      current_ads: "string (optional notes on current creatives)",
      proof_url: "string (optional sample/case study URL)",
    },
    async handler(input) {
      const brief = str(input, "brief");
      if (brief.length < 40) throw new Error("brief must include the merchant, offer, channel, and desired result");
      const product = optionalStr(input, "product") || inferProduct(brief);
      const offer = optionalStr(input, "offer") || "faster, clearer merchant payouts";
      const currentAds = optionalStr(input, "current_ads") || "current creative performance not provided";
      const proofUrl = optionalStr(input, "proof_url");

      return {
        product,
        recommended_listing: "Shopify fintech UGC creative revamp",
        price_anchor: "$2k-$3k human project; $49 automated scope pack",
        fit_score: scoreFit(brief, ["shopify", "merchant", "payout", "meta", "ugc"]),
        creative_angles: [
          `Before/after cash-flow story: merchant goes from payout uncertainty to ${offer}.`,
          "Founder-style trust proof: show the dashboard, settlement timing, and a real workflow without hype.",
          "Operator pain hook: inventory, payroll, and ad spend decisions blocked by slow payout visibility.",
          "Side-by-side competitor friction: old payout process versus the automated flow.",
        ],
        script_pack: [
          buildScript("Cash-flow crunch", "I sold out this weekend, but the payout timing still decides what I can restock.", offer),
          buildScript("Dashboard proof", "Here is the payout view I wish Shopify merchants had from day one.", offer),
          buildScript("Operator checklist", "If your store is scaling, watch these three payout bottlenecks.", offer),
          buildScript("Objection handler", "This is not a loan pitch. It is payout visibility your finance workflow can actually use.", offer),
        ],
        funnel_fixes: [
          "Put the payout outcome above the fold before product mechanics.",
          "Move trust proof, supported rails, and security language before the first signup CTA.",
          "Add a mobile screenshot strip showing the exact merchant workflow.",
          "Track ad click -> signup -> connection start -> activation, not just page visits.",
        ],
        intake_questions: [
          "Which merchant segment is highest value: solo operators, agencies, or high-volume stores?",
          "What is the current Meta CPA by creative concept?",
          "Which payout claim is legally approved and provable?",
          "Can the landing page show real product screens?",
        ],
        current_ads: currentAds,
        response_template: `I can scope the UGC revamp around ${product}: 3-4 scripts, creator shot notes, and mobile funnel fixes tied to ${offer}. ${proofUrl ? `Sample: ${proofUrl}` : "I can attach one relevant fintech sample before kickoff."}`,
      };
    },
  },
  {
    slug: "tiktok-fintech-scale-audit",
    name: "TikTok Fintech Scale Audit",
    description: "Diagnose volatile TikTok acquisition for fintech apps and return a creative, landing-page, and event plan.",
    priceMicros: 69_000_000, // $69
    input: {
      brief: "string (project post or growth problem)",
      metrics: "string (optional CPA/CAC/CVR notes)",
      landing_page: "string (optional URL or notes)",
      deadline: "string (optional)",
      proof_url: "string (optional sample/case study URL)",
    },
    async handler(input) {
      const brief = str(input, "brief");
      if (brief.length < 40) throw new Error("brief must include the app, channel, problem, and target outcome");
      const metrics = optionalStr(input, "metrics") || "metrics not provided";
      const landingPage = optionalStr(input, "landing_page") || "landing page not provided";
      const deadline = optionalStr(input, "deadline") || inferDeadline(brief);
      const proofUrl = optionalStr(input, "proof_url");

      return {
        recommended_listing: "TikTok fintech creative + mobile signup audit",
        price_anchor: "$3k-$5k human project; $69 automated audit pack",
        fit_score: scoreFit(brief, ["tiktok", "fintech", "signup", "mobile", "yc"]),
        diagnosis: [
          "TikTok instability usually points to hook fatigue, weak native proof, or event mismatch before media-buying issues.",
          "Fintech signup flows need trust and clarity earlier than entertainment or ecommerce flows.",
          "If the optimized event is too shallow, TikTok may find cheap curiosity instead of qualified users.",
        ],
        test_matrix: [
          { lane: "Hook", variants: ["money moment", "pain confession", "dashboard proof", "myth correction"] },
          { lane: "Format", variants: ["founder face", "screen recording", "street-style question", "duet/reaction"] },
          { lane: "Offer", variants: ["speed", "control", "risk reduction", "workflow saved"] },
        ],
        mobile_funnel_fixes: [
          "Reduce first-screen copy to one outcome, one trust proof, one CTA.",
          "Push compliance and security reassurance close to the first form interaction.",
          "Make the signup CTA persistent after the first scroll on mobile.",
          "Instrument signup start, KYC start, activation, and qualified lead separately.",
        ],
        requested_inputs: [
          "Top five TikTok ads by spend with hook, CPA, hold rate, and signup conversion.",
          "Current landing page screenshots on mobile.",
          "Event mapping from TikTok Ads Manager to backend activation.",
        ],
        metrics,
        landing_page: landingPage,
        response_template: `I can audit the TikTok side for the next ${deadline}: creative angles, mobile signup friction, and event quality. ${proofUrl ? `Case study/sample: ${proofUrl}` : "I can share a fintech growth sample before the call."}`,
      };
    },
  },
  {
    slug: "salesforce-revops-cleanup",
    name: "Salesforce RevOps Cleanup Pack",
    description: "Turn messy Salesforce pipeline notes into fields, automations, dashboards, and a 30/90-day cleanup plan.",
    priceMicros: 59_000_000, // $59
    input: {
      pipeline_notes: "string (current Salesforce pain, objects, reports, handoffs)",
      crm_object: "string (Lead, Opportunity, Account, Case, optional)",
      team_size: "string (optional)",
      target_metric: "string (optional)",
    },
    async handler(input) {
      const notes = str(input, "pipeline_notes");
      if (notes.length < 40) throw new Error("pipeline_notes must describe the Salesforce workflow and pain points");
      const objectName = optionalStr(input, "crm_object") || inferCrmObject(notes);
      const teamSize = optionalStr(input, "team_size") || "team size not specified";
      const targetMetric = optionalStr(input, "target_metric") || "pipeline hygiene and conversion visibility";

      return {
        recommended_listing: "Salesforce pipeline cleanup and automation scope",
        price_anchor: "$3k-$8k implementation discovery; $59 automated RevOps pack",
        object: objectName,
        team_size: teamSize,
        target_metric: targetMetric,
        quick_wins: [
          `Define required ${objectName} fields only at the stage where they become operationally necessary.`,
          "Create one stale-record view per owner before adding automation.",
          "Separate source-of-truth fields from temporary sales notes.",
          "Add validation rules after reporting gaps are visible, not before.",
        ],
        field_map: [
          `${objectName}.Lifecycle_Status`,
          `${objectName}.Next_Action_Date`,
          `${objectName}.Source_Detail`,
          `${objectName}.Disqualification_Reason`,
          `${objectName}.Implementation_Risk`,
        ],
        automation_plan: [
          "Day 0-7: normalize statuses, owners, and required fields.",
          "Day 8-30: add assignment, stale-record, and handoff automations.",
          "Day 31-90: add forecast dashboards, SLA alerts, and lifecycle QA.",
        ],
        dashboard_cards: [
          "Stage conversion by owner",
          "Aging pipeline by next action",
          "Lead source quality",
          "Forecast risk by close date",
        ],
        risks: [
          "Over-automating a messy process locks in the mess.",
          "Validation rules can reduce adoption if reps do not understand the operational reason.",
          "Dashboards are only useful after stage definitions are stable.",
        ],
      };
    },
  },
  {
    slug: "formula-ops-builder",
    name: "Formula Ops Builder",
    description: "Convert spreadsheet chaos into formulas, validation rules, and a path from sheet to automation.",
    priceMicros: 19_000_000, // $19
    input: {
      sheet_goal: "string (what the sheet should calculate or control)",
      columns: "string (optional column names or sample row)",
      platform: "string (Google Sheets, Excel, Airtable, optional)",
      automation_goal: "string (optional)",
    },
    async handler(input) {
      const goal = str(input, "sheet_goal");
      if (goal.length < 25) throw new Error("sheet_goal must describe the workflow and calculation needed");
      const columns = optionalStr(input, "columns") || "columns not provided";
      const platform = optionalStr(input, "platform") || inferSheetPlatform(goal);
      const automationGoal = optionalStr(input, "automation_goal") || "reduce manual weekly updates";

      return {
        platform,
        recommended_listing: "Spreadsheet formula and automation build spec",
        price_anchor: "$500-$2k ops build; $19 automated formula spec",
        model: [
          "Inputs: raw data pasted or synced into one locked tab.",
          "Logic: helper columns calculate status, exception, priority, and owner.",
          "Output: operator dashboard with only decisions and actions.",
        ],
        formula_blueprints: [
          { purpose: "status classification", formula: '=IFS(ISBLANK([Next Action]),"Needs action",[Due Date]<TODAY(),"Overdue",TRUE,"On track")' },
          { purpose: "owner workload", formula: "=QUERY(A:Z,\"select Owner,count(ID) where Status <> 'Done' group by Owner\",1)" },
          { purpose: "priority score", formula: '=ROUND((Revenue*0.5)+(Urgency*0.3)+(Risk*0.2),2)' },
          { purpose: "exception list", formula: '=FILTER(A:Z,(Status="Overdue")+(Risk>=4))' },
        ],
        validation_rules: [
          "Use dropdowns for status, owner, source, and risk.",
          "Protect formula columns and expose only input fields.",
          "Add conditional formatting for overdue, missing owner, and high-value exceptions.",
        ],
        automation_path: [
          `Quick: build formulas and validation in ${platform}.`,
          "Next: add scheduled import/export or Zapier/Make handoff.",
          `Long term: move recurring decisions into a small internal tool once ${automationGoal} is stable.`,
        ],
        columns,
      };
    },
  },
  {
    slug: "creator-adaptation-radar",
    name: "Creator Adaptation Radar",
    description: "Turn creator, YouTube, or founder notes into quick experiments and a long-term adaptation roadmap.",
    priceMicros: 39_000_000, // $39
    input: {
      niche: "string (audience or market)",
      notes: "string (video notes, transcript, comments, or trend observations)",
      platform: "string (YouTube, TikTok, LinkedIn, optional)",
      horizon: "string (optional: 7 days, 30 days, 90 days)",
    },
    async handler(input) {
      const niche = str(input, "niche");
      const notes = str(input, "notes");
      if (notes.length < 40) throw new Error("notes must include the signals, videos, comments, or market shifts to adapt");
      const platform = optionalStr(input, "platform") || "YouTube and short-form video";
      const horizon = optionalStr(input, "horizon") || "7/30/90 days";

      return {
        recommended_listing: "Creator-market adaptation brief",
        price_anchor: "$1k-$4k content strategy sprint; $39 automated adaptation radar",
        niche,
        platform,
        horizon,
        quick_experiments: [
          "Rewrite one high-performing idea for a beginner, operator, and skeptic audience.",
          "Convert the strongest comment objection into a short-form hook.",
          "Ship one proof-led post: screen, number, teardown, or before/after workflow.",
          "Test a title that names the painful transition, not the generic topic.",
        ],
        long_term_moves: [
          "Build a repeatable content operating system: signal capture, angle bank, script, publish, measure.",
          "Turn recurring audience questions into productized tools or lead magnets.",
          "Create a quarterly adaptation memo: what changed, what to ignore, what to test.",
          "Move winning posts into evergreen landing-page proof and sales enablement.",
        ],
        signal_map: extractSignals(notes),
        output_formats: [
          "7-day experiment board",
          "30-day content and offer map",
          "90-day productized tool roadmap",
        ],
        caution: "This tool uses the notes you provide; it does not scrape live platforms or guarantee current platform trends.",
      };
    },
  },
];

function inferProduct(brief: string): string {
  const s = brief.toLowerCase();
  if (s.includes("shopify")) return "Shopify merchant payout automation";
  if (s.includes("yc")) return "YC-backed fintech app";
  return "Fintech product";
}

function inferChannel(brief: string): string {
  const s = brief.toLowerCase();
  if (s.includes("tiktok")) return "TikTok";
  if (s.includes("meta")) return "Meta Ads";
  return "Paid social";
}

function inferBudget(brief: string): string {
  const match = brief.match(/\$[\d,.]+(?:\s*-\s*\$?[\d,.]+)?\s*k?/i);
  return match?.[0] ?? "not specified";
}

function inferDeadline(brief: string): string {
  const s = brief.toLowerCase();
  if (s.includes("2 weeks") || s.includes("two weeks")) return "2 weeks";
  if (s.includes("4-week") || s.includes("4 week") || s.includes("four week")) return "4 weeks";
  return "next campaign cycle";
}

function buildScript(angle: string, hook: string, offer: string): Record<string, unknown> {
  return {
    angle,
    hook,
    body: [
      "Show the current manual or confusing workflow in the first three seconds.",
      `Name the change: ${offer}.`,
      "Cut to proof: dashboard, metric, or customer workflow.",
      "Close with one action: audit, demo, signup, or reply.",
    ],
    shot_notes: ["phone-first framing", "real screen capture", "caption every claim", "avoid stock footage"],
  };
}

function scoreFit(text: string, terms: string[]): number {
  const s = text.toLowerCase();
  const hits = terms.filter((term) => s.includes(term)).length;
  return Math.min(100, 55 + hits * 9);
}

function inferCrmObject(notes: string): string {
  const s = notes.toLowerCase();
  if (s.includes("case") || s.includes("support")) return "Case";
  if (s.includes("account")) return "Account";
  if (s.includes("lead")) return "Lead";
  return "Opportunity";
}

function inferSheetPlatform(goal: string): string {
  const s = goal.toLowerCase();
  if (s.includes("excel")) return "Excel";
  if (s.includes("airtable")) return "Airtable";
  return "Google Sheets";
}

function extractSignals(notes: string): string[] {
  const cleaned = notes
    .split(/\n|\.|;|-/)
    .map((part) => part.trim())
    .filter((part) => part.length > 10)
    .slice(0, 6);
  return cleaned.length ? cleaned : [notes.slice(0, 160)];
}

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
