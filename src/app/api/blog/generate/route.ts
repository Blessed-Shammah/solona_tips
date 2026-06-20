// POST /api/blog/generate — trigger an AI blog DRAFT (admin-gated). Body: { topic }.
// The draft is written reviewed:false and must be human-approved before it publishes.
// Schedule this (cron / Vercel Cron / the routines feature) to keep a steady stream of drafts.
//
// NOTE: in a container, generated drafts live on the local filesystem — commit them to the repo
// (or mount a volume at /app/content) so they survive restarts and go through code review.
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

export const maxDuration = 120;

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let topic = "";
  try {
    topic = String((await req.json())?.topic ?? "").trim();
  } catch {
    /* validated below */
  }
  if (!topic) return NextResponse.json({ error: "topic is required" }, { status: 400 });

  try {
    const { generatePost } = await import("@/lib/blog/generate.mjs");
    const result = await generatePost(topic);
    return NextResponse.json({ ok: true, ...result, note: "Draft saved reviewed:false — review + fact-check, then set reviewed:true to publish." });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
