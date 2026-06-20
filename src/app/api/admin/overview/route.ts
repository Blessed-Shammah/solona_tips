// GET /api/admin/overview — aggregated operator view (admin-gated by ADMIN_SECRET).
import { NextResponse } from "next/server";
import { isAdmin, adminConfigured } from "@/lib/auth";
import { listInvoices } from "@/lib/db";
import {
  listAccounts, usageSummary, listRefunds, listRefundDuePayments, listContactMessages,
} from "@/lib/spine/store";

export function GET(req: Request) {
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Admin is not configured. Set ADMIN_SECRET on the server." }, { status: 503 });
  }
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const invoices = listInvoices(20);
  const accounts = listAccounts(20);
  const usage = usageSummary();
  const refunds = listRefunds(20);
  const refundsDue = listRefundDuePayments().length;
  const contact = listContactMessages(20);

  const paid = invoices.filter((i) => i.status === "paid").length;
  const balanceHeld = accounts.reduce((a, x) => a + x.balance_micros, 0);

  return NextResponse.json({
    stats: {
      accounts: accounts.length,
      proAccounts: accounts.filter((a) => a.plan === "pro").length,
      invoices: invoices.length,
      invoicesPaid: paid,
      toolCalls: usage.calls,
      revenueUsd: (usage.revenueMicros / 1_000_000).toFixed(4),
      creditBalanceHeldUsd: (balanceHeld / 1_000_000).toFixed(2),
      refundsDue,
    },
    accounts: accounts.map((a) => ({ id: a.id, name: a.name, email: a.email ?? null, plan: a.plan, balance_usd: (a.balance_micros / 1_000_000).toFixed(4) })),
    invoices: invoices.map((i) => ({ id: i.id, rail: i.rail_id, amount: i.amount_decimal, status: i.status, at: i.created_at })),
    refunds: refunds.map((r) => ({ id: r.id, amount_usd: (r.amount_micros / 1_000_000).toFixed(4), to: r.to_address, status: r.status })),
    contact: contact.map((c) => ({ name: c.name, email: c.email, subject: c.subject, message: c.message, at: c.created_at })),
  });
}
