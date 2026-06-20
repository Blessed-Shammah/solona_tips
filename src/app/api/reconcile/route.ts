// GET/POST /api/reconcile — manual/external trigger for the Track-B reconciler. The app ALSO runs
// this on an internal timer (src/instrumentation.ts), so an external cron is optional but supported.
import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { runReconcilePass } from "@/lib/reconcile";

async function run(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const summary = await runReconcilePass();
  return NextResponse.json(summary);
}

export const GET = run;
export const POST = run;
