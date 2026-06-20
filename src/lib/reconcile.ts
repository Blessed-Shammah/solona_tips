// reconcile.ts — Track B (safe) reconciliation pass, shared by the /api/reconcile route AND the
// built-in cron (src/instrumentation.ts). Walks open invoices, settles them on-chain, and applies
// credit top-ups exactly-once. Source of truth that backs the fast client poll (Safety Law #6).
import { listOpenInvoices } from "./db";
import { settleInvoice } from "./settle";
import { getCreditOrder, applyCreditOnce, getPlanOrder, applyPlanUpgradeOnce } from "./spine/store";

export interface ReconcileSummary {
  checked: number;
  newlyPaid: number;
  creditsApplied: number;
  upgradesApplied: number;
  refundsDue: number;
  results: Array<{ id: string; status: string; credited: number; refundDue: boolean }>;
}

export async function runReconcilePass(): Promise<ReconcileSummary> {
  const open = listOpenInvoices();
  const results: ReconcileSummary["results"] = [];
  let creditsApplied = 0;
  let upgradesApplied = 0;

  for (const invoice of open) {
    try {
      const s = await settleInvoice(invoice);
      if (s.status === "paid") {
        // Apply whatever this invoice funded — a credit top-up or a Pro upgrade — exactly-once.
        const credit = getCreditOrder(invoice.id);
        if (credit && applyCreditOnce(credit.invoice_id, credit.account_id, credit.micros)) creditsApplied++;
        const upgrade = getPlanOrder(invoice.id);
        if (upgrade && applyPlanUpgradeOnce(upgrade.invoice_id, upgrade.account_id, upgrade.plan)) upgradesApplied++;
      }
      results.push({ id: invoice.id, status: s.status, credited: s.credited, refundDue: s.refundDue });
    } catch (e) {
      results.push({ id: invoice.id, status: `error: ${(e as Error).message}`, credited: 0, refundDue: false });
    }
  }

  return {
    checked: open.length,
    newlyPaid: results.filter((r) => r.status === "paid").length,
    creditsApplied,
    upgradesApplied,
    refundsDue: results.filter((r) => r.refundDue).length,
    results,
  };
}
