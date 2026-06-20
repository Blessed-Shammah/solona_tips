// GET /api/health — liveness/readiness probe for load balancers and orchestrators.
import { NextResponse } from "next/server";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "soltip",
    cluster: config.cluster,
    time: new Date().toISOString(),
  });
}
