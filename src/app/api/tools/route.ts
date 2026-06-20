// GET /api/tools — agent-readable catalog discovery. An AI agent reads this to learn what tools
// exist, what they cost, and how to call them.
import { NextResponse } from "next/server";
import { discoveryView } from "@/lib/spine/catalog";

export async function GET() {
  return NextResponse.json({ tools: discoveryView() });
}
