// instrumentation.ts — Next's startup hook. Runs the reconciliation loop INSIDE the app process so
// a single Docker container settles payments on a timer with no external cron.
//
// It calls the /api/reconcile HTTP endpoint (rather than importing the DB layer) so this file stays
// free of native deps — otherwise Next tries to bundle better-sqlite3 into the edge runtime.
// On serverless, set ENABLE_RECONCILE_CRON=false and use a platform cron hitting /api/reconcile.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.ENABLE_RECONCILE_CRON === "false") return;

  const intervalMs = Math.max(15_000, Number(process.env.RECONCILE_INTERVAL_MS || 60_000));
  const port = process.env.PORT || "3000";
  const secret = process.env.ADMIN_SECRET || "";
  const url = `http://127.0.0.1:${port}/api/reconcile`;
  const headers: Record<string, string> = secret ? { authorization: `Bearer ${secret}` } : {};

  let running = false;
  const tick = async () => {
    if (running) return; // never overlap passes
    running = true;
    try {
      const res = await fetch(url, { headers });
      if (res.ok) {
        const s = await res.json();
        if (s.checked > 0) {
          console.log(`[reconcile] checked=${s.checked} paid=${s.newlyPaid} credits=${s.creditsApplied} refundsDue=${s.refundsDue}`);
        }
      }
    } catch {
      /* server may still be warming up — try again next tick */
    } finally {
      running = false;
    }
  };

  // Stagger the first run so the HTTP server is listening, then poll on the interval.
  setTimeout(tick, 10_000);
  setInterval(tick, intervalMs);
  console.log(`[reconcile] internal cron enabled — every ${intervalMs}ms`);
}
