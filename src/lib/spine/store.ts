// store.ts — spine persistence: accounts, the tool catalog, the usage ledger, and credit
// applications. Reuses the same SQLite connection as the payment ledger. All money/usage paths are
// exactly-once via UNIQUE constraints (call_id for metering, invoice_id for credit top-ups).
//
// Balances are denominated in canonical USDC micro-units (6dp) as INTEGER — rail-agnostic credit.
import { randomUUID, randomBytes } from "node:crypto";
import { db } from "../db";

export interface Account {
  id: string;
  name: string;
  api_key: string;
  plan: "free" | "pro";
  balance_micros: number;
  created_at: number;
  email?: string | null;
  password_hash?: string | null;
}

export interface Tool {
  id: string;
  account_id: string | null; // null = platform built-in
  slug: string;
  name: string;
  description: string;
  price_micros: number; // price per call, USDC micros
  handler: string; // built-in handler key
  created_at: number;
}

export interface UsageRecord {
  id: string;
  account_id: string;
  tool_id: string;
  tool_slug: string;
  call_id: string;
  cost_micros: number;
  output: string;
  created_at: number;
}

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    api_key        TEXT NOT NULL UNIQUE,
    plan           TEXT NOT NULL DEFAULT 'free',
    balance_micros INTEGER NOT NULL DEFAULT 0,
    created_at     INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tools (
    id           TEXT PRIMARY KEY,
    account_id   TEXT,
    slug         TEXT NOT NULL UNIQUE,
    name         TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    price_micros INTEGER NOT NULL,
    handler      TEXT NOT NULL,
    created_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS usage_records (
    id          TEXT PRIMARY KEY,
    account_id  TEXT NOT NULL,
    tool_id     TEXT NOT NULL,
    tool_slug   TEXT NOT NULL,
    call_id     TEXT NOT NULL,
    cost_micros INTEGER NOT NULL,
    output      TEXT NOT NULL DEFAULT '',
    created_at  INTEGER NOT NULL
  );
  -- Exactly-once metering: one charge per call_id (Idempotency-Key). Replays no-op.
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_call ON usage_records (call_id);
  CREATE INDEX IF NOT EXISTS idx_usage_account ON usage_records (account_id, created_at);

  CREATE TABLE IF NOT EXISTS credit_orders (
    invoice_id  TEXT PRIMARY KEY,   -- the spine invoice that funds this top-up
    account_id  TEXT NOT NULL,
    micros      INTEGER NOT NULL,   -- credit to apply once settled
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS credit_applications (
    invoice_id  TEXT PRIMARY KEY,   -- exactly-once: a settled invoice tops up balance exactly once
    account_id  TEXT NOT NULL,
    micros      INTEGER NOT NULL,
    created_at  INTEGER NOT NULL
  );

  -- Pro upgrades are gated behind a real payment (not a free toggle).
  CREATE TABLE IF NOT EXISTS plan_orders (
    invoice_id  TEXT PRIMARY KEY,
    account_id  TEXT NOT NULL,
    plan        TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS plan_applications (
    invoice_id  TEXT PRIMARY KEY,   -- exactly-once: a settled invoice upgrades the plan exactly once
    account_id  TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    subject    TEXT NOT NULL DEFAULT '',
    message    TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS refunds (
    id            TEXT PRIMARY KEY,
    payment_id    INTEGER NOT NULL UNIQUE,   -- one refund per source payment (exactly-once)
    invoice_id    TEXT,
    amount_micros INTEGER NOT NULL,
    to_address    TEXT,
    status        TEXT NOT NULL,             -- 'manual_required' | 'sent'
    tx_signature  TEXT,
    created_at    INTEGER NOT NULL
  );
`);

// Migration: add auth columns to accounts if missing. Idempotent + race-safe (concurrent build
// workers may run this against the same DB file), so a duplicate-column error is swallowed.
{
  const addColumn = (sql: string) => {
    try {
      db.exec(sql);
    } catch (e) {
      if (!/duplicate column name/i.test(String(e))) throw e;
    }
  };
  addColumn(`ALTER TABLE accounts ADD COLUMN email TEXT`);
  addColumn(`ALTER TABLE accounts ADD COLUMN password_hash TEXT`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS uniq_account_email ON accounts(email) WHERE email IS NOT NULL`);
}

function apiKey(): string {
  return "sk_live_" + randomBytes(24).toString("base64url");
}

// ── Accounts ────────────────────────────────────────────────────────────────
export function createAccount(name: string): Account {
  const id = randomUUID();
  const key = apiKey();
  db.prepare(
    `INSERT INTO accounts (id, name, api_key, plan, balance_micros, created_at)
     VALUES (?, ?, ?, 'free', 0, ?)`,
  ).run(id, name || "Untitled", key, Date.now());
  return getAccount(id)!;
}

export function getAccount(id: string): Account | undefined {
  return db.prepare(`SELECT * FROM accounts WHERE id = ?`).get(id) as Account | undefined;
}

export function getAccountByApiKey(key: string): Account | undefined {
  return db.prepare(`SELECT * FROM accounts WHERE api_key = ?`).get(key) as Account | undefined;
}

export function getAccountByEmail(email: string): Account | undefined {
  return db.prepare(`SELECT * FROM accounts WHERE email = ?`).get(email.toLowerCase()) as Account | undefined;
}

export function setCredentials(accountId: string, email: string, passwordHash: string): void {
  db.prepare(`UPDATE accounts SET email = ?, password_hash = ? WHERE id = ?`).run(email.toLowerCase(), passwordHash, accountId);
}

// ── Sessions ──────────────────────────────────────────────────────────────────
const SESSION_TTL_MS = 30 * 24 * 60 * 60_000; // 30 days

export function createSession(accountId: string): string {
  const token = "ses_" + randomBytes(32).toString("base64url");
  const now = Date.now();
  db.prepare(`INSERT INTO sessions (token, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)`)
    .run(token, accountId, now, now + SESSION_TTL_MS);
  return token;
}

export function getSessionAccount(token: string): Account | undefined {
  const row = db
    .prepare(`SELECT a.* FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.token = ? AND s.expires_at > ?`)
    .get(token, Date.now()) as Account | undefined;
  return row;
}

export function deleteSession(token: string): void {
  db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}

export function setPlan(accountId: string, plan: "free" | "pro"): void {
  db.prepare(`UPDATE accounts SET plan = ? WHERE id = ?`).run(plan, accountId);
}

export function listAccounts(limit = 50): Account[] {
  return db.prepare(`SELECT * FROM accounts ORDER BY created_at DESC LIMIT ?`).all(limit) as Account[];
}

export function usageSummary(): { calls: number; revenueMicros: number } {
  const r = db.prepare(`SELECT COUNT(*) AS calls, COALESCE(SUM(cost_micros),0) AS revenue FROM usage_records`).get() as { calls: number; revenue: number };
  return { calls: r.calls, revenueMicros: r.revenue };
}

export function accountUsageSummary(accountId: string): { calls: number; spentMicros: number } {
  const r = db.prepare(`SELECT COUNT(*) AS calls, COALESCE(SUM(cost_micros),0) AS spent FROM usage_records WHERE account_id = ?`).get(accountId) as { calls: number; spent: number };
  return { calls: r.calls, spentMicros: r.spent };
}

/** Rotate (regenerate) an account's API key — invalidates the old one immediately. */
export function rotateApiKey(accountId: string): string {
  const key = apiKey();
  db.prepare(`UPDATE accounts SET api_key = ? WHERE id = ?`).run(key, accountId);
  return key;
}

// ── Contact messages ─────────────────────────────────────────────────────────
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: number;
}

export function saveContactMessage(m: Omit<ContactMessage, "id" | "created_at">): ContactMessage {
  const id = randomUUID();
  const created_at = Date.now();
  db.prepare(
    `INSERT INTO contact_messages (id, name, email, subject, message, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, m.name, m.email, m.subject, m.message, created_at);
  return { id, created_at, ...m };
}

export function listContactMessages(limit = 100): ContactMessage[] {
  return db.prepare(`SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT ?`).all(limit) as ContactMessage[];
}

export function countContactMessages(): number {
  return (db.prepare(`SELECT COUNT(*) AS count FROM contact_messages`).get() as { count: number }).count;
}

// ── Refunds ───────────────────────────────────────────────────────────────────
export interface RefundDuePayment {
  payment_id: number;
  invoice_id: string;
  tx_signature: string;
  amount_base_units: string;
  status: string;
  is_extra: boolean;
}

/** Payments flagged refund_due that have no active refund record, or whose previous attempt failed. */
export function listRefundDuePayments(): RefundDuePayment[] {
  const rows = db
    .prepare(
      `SELECT
         p.id AS payment_id,
         p.invoice_id,
         p.tx_signature,
         p.amount_base_units,
         p.status,
         EXISTS (
           SELECT 1 FROM payments prior
           WHERE prior.invoice_id = p.invoice_id AND prior.id < p.id
         ) AS is_extra
       FROM payments p
       LEFT JOIN refunds r ON r.payment_id = p.id
       WHERE p.refund_due = 1
         AND (r.id IS NULL OR r.status = 'failed')
       ORDER BY p.created_at ASC`,
    )
    .all() as Array<Omit<RefundDuePayment, "is_extra"> & { is_extra: 0 | 1 }>;
  return rows.map((r) => ({ ...r, is_extra: !!r.is_extra }));
}

/** Record a refund exactly-once (unique on payment_id) and clear the payment's refund_due flag. */
export const recordRefundOnce = db.transaction(
  (paymentId: number, invoiceId: string, amountMicros: number, toAddress: string | null, status: string, txSig: string | null): boolean => {
    try {
      db.prepare(
        `INSERT INTO refunds (id, payment_id, invoice_id, amount_micros, to_address, status, tx_signature, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(randomUUID(), paymentId, invoiceId, amountMicros, toAddress, status, txSig, Date.now());
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e && String((e as { code: string }).code).startsWith("SQLITE_CONSTRAINT")) return false;
      throw e;
    }
    db.prepare(`UPDATE payments SET refund_due = 0 WHERE id = ?`).run(paymentId);
    return true;
  },
);

export interface RefundAttempt {
  id: string;
  started: boolean;
  status: string;
}

/**
 * Reserve a refund row before any live payout is sent. The UNIQUE(payment_id) constraint is the
 * exactly-once gate; failed attempts may be retried by moving the same row back to pending.
 */
export const beginRefundAttempt = db.transaction(
  (paymentId: number, invoiceId: string, amountMicros: number, toAddress: string | null): RefundAttempt => {
    const existing = db.prepare(`SELECT id, status FROM refunds WHERE payment_id = ?`).get(paymentId) as
      | { id: string; status: string }
      | undefined;
    if (existing && existing.status !== "failed") return { id: existing.id, status: existing.status, started: false };

    if (existing) {
      db.prepare(
        `UPDATE refunds
         SET invoice_id = ?, amount_micros = ?, to_address = ?, status = 'pending', tx_signature = NULL
         WHERE id = ?`,
      ).run(invoiceId, amountMicros, toAddress, existing.id);
      return { id: existing.id, status: "pending", started: true };
    }

    const id = randomUUID();
    db.prepare(
      `INSERT INTO refunds (id, payment_id, invoice_id, amount_micros, to_address, status, tx_signature, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?)`,
    ).run(id, paymentId, invoiceId, amountMicros, toAddress, Date.now());
    return { id, status: "pending", started: true };
  },
);

export const markRefundSent = db.transaction((refundId: string, paymentId: number, txSignature: string): void => {
  db.prepare(`UPDATE refunds SET status = 'sent', tx_signature = ? WHERE id = ?`).run(txSignature, refundId);
  db.prepare(`UPDATE payments SET refund_due = 0 WHERE id = ?`).run(paymentId);
});

export const markRefundManualRequired = db.transaction((refundId: string, paymentId: number): void => {
  db.prepare(`UPDATE refunds SET status = 'manual_required' WHERE id = ?`).run(refundId);
  db.prepare(`UPDATE payments SET refund_due = 0 WHERE id = ?`).run(paymentId);
});

export function markRefundFailed(refundId: string): void {
  db.prepare(`UPDATE refunds SET status = 'failed' WHERE id = ?`).run(refundId);
}

export interface Refund {
  id: string;
  payment_id: number;
  invoice_id: string;
  amount_micros: number;
  to_address: string | null;
  status: string;
  tx_signature: string | null;
  created_at: number;
}

export function listRefunds(limit = 100): Refund[] {
  return db.prepare(`SELECT * FROM refunds ORDER BY created_at DESC LIMIT ?`).all(limit) as Refund[];
}

// ── Pro upgrade orders (gated behind payment) ─────────────────────────────────
export function recordPlanOrder(invoiceId: string, accountId: string, plan: string): void {
  db.prepare(`INSERT OR IGNORE INTO plan_orders (invoice_id, account_id, plan, created_at) VALUES (?, ?, ?, ?)`)
    .run(invoiceId, accountId, plan, Date.now());
}

export function getPlanOrder(invoiceId: string): { invoice_id: string; account_id: string; plan: string } | undefined {
  return db.prepare(`SELECT * FROM plan_orders WHERE invoice_id = ?`).get(invoiceId) as
    | { invoice_id: string; account_id: string; plan: string }
    | undefined;
}

/** Apply a settled upgrade EXACTLY ONCE (guarded by plan_applications PK). */
export const applyPlanUpgradeOnce = db.transaction((invoiceId: string, accountId: string, plan: string): boolean => {
  try {
    db.prepare(`INSERT INTO plan_applications (invoice_id, account_id, created_at) VALUES (?, ?, ?)`)
      .run(invoiceId, accountId, Date.now());
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
      return false;
    }
    throw e;
  }
  db.prepare(`UPDATE accounts SET plan = ? WHERE id = ?`).run(plan, accountId);
  return true;
});

// ── Tools (catalog) ───────────────────────────────────────────────────────────
export function upsertTool(t: Omit<Tool, "created_at">): void {
  db.prepare(
    `INSERT INTO tools (id, account_id, slug, name, description, price_micros, handler, created_at)
     VALUES (@id, @account_id, @slug, @name, @description, @price_micros, @handler, @created_at)
     ON CONFLICT(slug) DO UPDATE SET
       name=excluded.name, description=excluded.description,
       price_micros=excluded.price_micros, handler=excluded.handler`,
  ).run({ ...t, created_at: Date.now() });
}

export function listTools(): Tool[] {
  return db.prepare(`SELECT * FROM tools ORDER BY created_at ASC`).all() as Tool[];
}

export function getTool(slug: string): Tool | undefined {
  return db.prepare(`SELECT * FROM tools WHERE slug = ?`).get(slug) as Tool | undefined;
}

// ── Usage ───────────────────────────────────────────────────────────────────
export function getUsageByCallId(callId: string): UsageRecord | undefined {
  return db.prepare(`SELECT * FROM usage_records WHERE call_id = ?`).get(callId) as UsageRecord | undefined;
}

export function usageCountSince(accountId: string, sinceMs: number): number {
  const r = db
    .prepare(`SELECT COUNT(*) AS n FROM usage_records WHERE account_id = ? AND created_at >= ?`)
    .get(accountId, sinceMs) as { n: number };
  return r.n;
}

export function listUsage(accountId: string, limit = 25): UsageRecord[] {
  return db
    .prepare(`SELECT * FROM usage_records WHERE account_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(accountId, limit) as UsageRecord[];
}

/**
 * Insert a usage record exactly-once WITHOUT debiting a balance — used by the x402 pay-per-call
 * path, where the on-chain payment itself is the charge (no prepaid account). Returns false on a
 * duplicate call_id (already consumed), so a paid reference can be redeemed exactly once.
 */
export function insertUsageOnce(
  accountId: string,
  toolId: string,
  toolSlug: string,
  callId: string,
  costMicros: number,
  output: string,
): boolean {
  try {
    db.prepare(
      `INSERT INTO usage_records (id, account_id, tool_id, tool_slug, call_id, cost_micros, output, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(randomUUID(), accountId, toolId, toolSlug, callId, costMicros, output, Date.now());
    return true;
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "SQLITE_CONSTRAINT_UNIQUE") {
      return false;
    }
    throw e;
  }
}

export class InsufficientCredits extends Error {}

/**
 * Atomically: record the call (exactly-once on call_id) AND debit the balance, or roll back both.
 * Throws SQLITE_CONSTRAINT_UNIQUE on replay, InsufficientCredits if the balance can't cover it.
 */
export const meterTxn = db.transaction(
  (accountId: string, toolId: string, toolSlug: string, callId: string, costMicros: number, output: string) => {
    db.prepare(
      `INSERT INTO usage_records (id, account_id, tool_id, tool_slug, call_id, cost_micros, output, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(randomUUID(), accountId, toolId, toolSlug, callId, costMicros, output, Date.now());

    const res = db
      .prepare(`UPDATE accounts SET balance_micros = balance_micros - ? WHERE id = ? AND balance_micros >= ?`)
      .run(costMicros, accountId, costMicros);
    if (res.changes === 0) throw new InsufficientCredits(); // rolls back the usage insert
  },
);

// ── Credit top-ups ────────────────────────────────────────────────────────────
export function recordCreditOrder(invoiceId: string, accountId: string, micros: number): void {
  db.prepare(
    `INSERT OR IGNORE INTO credit_orders (invoice_id, account_id, micros, created_at) VALUES (?, ?, ?, ?)`,
  ).run(invoiceId, accountId, micros, Date.now());
}

export function getCreditOrder(invoiceId: string): { invoice_id: string; account_id: string; micros: number } | undefined {
  return db.prepare(`SELECT * FROM credit_orders WHERE invoice_id = ?`).get(invoiceId) as
    | { invoice_id: string; account_id: string; micros: number }
    | undefined;
}

/** Apply a settled top-up to the balance EXACTLY ONCE (guarded by credit_applications PK). */
export const applyCreditOnce = db.transaction((invoiceId: string, accountId: string, micros: number): boolean => {
  try {
    db.prepare(
      `INSERT INTO credit_applications (invoice_id, account_id, micros, created_at) VALUES (?, ?, ?, ?)`,
    ).run(invoiceId, accountId, micros, Date.now());
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
      return false; // already applied
    }
    throw e;
  }
  db.prepare(`UPDATE accounts SET balance_micros = balance_micros + ? WHERE id = ?`).run(micros, accountId);
  return true;
});
