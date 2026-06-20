// db.ts — the ledger. Exactly-once crediting is enforced by a UNIQUE(invoice_id, tx_signature)
// index decided by the database, not by application logic (Safety Law #5 + reconciliation.md).
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config";

export interface Invoice {
  id: string;
  reference: string;
  rail_id: string;
  mint: string;
  token_program: string;
  decimals: number;
  is_native: boolean;
  amount_decimal: string;
  amount_base_units: string; // bigint as text (sqlite has no native bigint)
  merchant_address: string;
  label: string;
  message: string;
  status: "pending" | "paid" | "underpaid" | "expired";
  created_at: number;
  expires_at: number;
  paid_at: number | null;
}

export interface Payment {
  id: number;
  invoice_id: string;
  tx_signature: string;
  amount_base_units: string;
  status: string;
  refund_due: boolean;
  created_at: number;
}

// Singleton connection (survives Next dev hot-reload via globalThis).
const g = globalThis as unknown as { __soltipDb?: Database.Database };

function init(): Database.Database {
  mkdirSync(dirname(config.databasePath), { recursive: true });
  const db = new Database(config.databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id                TEXT PRIMARY KEY,
      reference         TEXT NOT NULL UNIQUE,         -- Safety Law #9: fresh, unique per invoice
      rail_id           TEXT NOT NULL,
      mint              TEXT NOT NULL,
      token_program     TEXT NOT NULL,
      decimals          INTEGER NOT NULL,
      is_native         INTEGER NOT NULL DEFAULT 0,
      amount_decimal    TEXT NOT NULL,
      amount_base_units TEXT NOT NULL,
      merchant_address  TEXT NOT NULL,
      label             TEXT NOT NULL DEFAULT '',
      message           TEXT NOT NULL DEFAULT '',
      status            TEXT NOT NULL DEFAULT 'pending',
      created_at        INTEGER NOT NULL,
      expires_at        INTEGER NOT NULL,
      paid_at           INTEGER
    );

    CREATE TABLE IF NOT EXISTS payments (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id        TEXT NOT NULL REFERENCES invoices(id),
      tx_signature      TEXT NOT NULL,
      amount_base_units TEXT NOT NULL,
      status            TEXT NOT NULL,
      refund_due        INTEGER NOT NULL DEFAULT 0,
      created_at        INTEGER NOT NULL
    );

    -- The exactly-once gate. Concurrent webhook + poller deliveries collapse to one credit.
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_credit ON payments (invoice_id, tx_signature);
    CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoices (status, expires_at);
  `);
  return db;
}

export const db: Database.Database = g.__soltipDb ?? (g.__soltipDb = init());

function rowToInvoice(r: Record<string, unknown>): Invoice {
  return { ...(r as unknown as Invoice), is_native: !!r.is_native };
}

export function createInvoice(inv: Omit<Invoice, "status" | "paid_at"> & { status?: Invoice["status"] }): Invoice {
  db.prepare(
    `INSERT INTO invoices
      (id, reference, rail_id, mint, token_program, decimals, is_native, amount_decimal,
       amount_base_units, merchant_address, label, message, status, created_at, expires_at)
     VALUES
      (@id, @reference, @rail_id, @mint, @token_program, @decimals, @is_native, @amount_decimal,
       @amount_base_units, @merchant_address, @label, @message, @status, @created_at, @expires_at)`,
  ).run({
    ...inv,
    is_native: inv.is_native ? 1 : 0,
    status: inv.status ?? "pending",
  });
  return getInvoice(inv.id)!;
}

export function getInvoice(id: string): Invoice | undefined {
  const r = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  return r ? rowToInvoice(r) : undefined;
}

export function listInvoices(limit = 50): Invoice[] {
  const rows = db.prepare(`SELECT * FROM invoices ORDER BY created_at DESC LIMIT ?`).all(limit) as Record<string, unknown>[];
  return rows.map(rowToInvoice);
}

/** Open invoices the poller should re-check: still pending, not yet hard-expired by a grace window. */
export function listOpenInvoices(graceMs = 5 * 60_000): Invoice[] {
  const cutoff = Date.now() - graceMs;
  const rows = db
    .prepare(`SELECT * FROM invoices WHERE status = 'pending' AND expires_at > ? ORDER BY created_at ASC`)
    .all(cutoff) as Record<string, unknown>[];
  return rows.map(rowToInvoice);
}

export function markPaid(invoiceId: string): void {
  db.prepare(`UPDATE invoices SET status = 'paid', paid_at = ? WHERE id = ? AND status != 'paid'`).run(Date.now(), invoiceId);
}

export function markStatus(invoiceId: string, status: Invoice["status"]): void {
  db.prepare(`UPDATE invoices SET status = ? WHERE id = ? AND status = 'pending'`).run(status, invoiceId);
}

export type CreditOutcome = "credited_first" | "credited_extra" | "duplicate";

/**
 * Insert a payment, guarded by the UNIQUE(invoice_id, tx_signature) index.
 * Returns "duplicate" for replays (handled silently → exactly-once holds),
 * "credited_first" for the first valid transfer, "credited_extra" for a genuine double-pay.
 * Overpays and extra payments are flagged refund_due so the excess is never silently kept.
 */
export function creditOnce(invoiceId: string, signature: string, amountBaseUnits: bigint, status: string): CreditOutcome {
  const existing = db.prepare(`SELECT COUNT(*) AS n FROM payments WHERE invoice_id = ?`).get(invoiceId) as { n: number };
  const isExtra = existing.n > 0;
  const refundDue = isExtra || status === "overpaid";
  try {
    db.prepare(
      `INSERT INTO payments (invoice_id, tx_signature, amount_base_units, status, refund_due, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(invoiceId, signature, amountBaseUnits.toString(), status, refundDue ? 1 : 0, Date.now());
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "SQLITE_CONSTRAINT_UNIQUE") {
      return "duplicate"; // replay — already credited
    }
    throw e;
  }
  return isExtra ? "credited_extra" : "credited_first";
}

export function paymentsFor(invoiceId: string): Payment[] {
  const rows = db.prepare(`SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at ASC`).all(invoiceId) as Record<string, unknown>[];
  return rows.map((r) => ({ ...(r as unknown as Payment), refund_due: !!r.refund_due }));
}
