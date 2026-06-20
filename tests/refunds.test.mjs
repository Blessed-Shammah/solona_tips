// Refund accounting — overpay/double-pay flagging and exactly-once payout lifecycle.
// Mirrors the SQL invariants in src/lib/db.ts and src/lib/spine/store.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";

function freshDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id TEXT,
      tx_signature TEXT,
      amount_base_units TEXT,
      status TEXT,
      refund_due INTEGER DEFAULT 0,
      created_at INTEGER
    );
    CREATE TABLE refunds (
      id TEXT PRIMARY KEY,
      payment_id INTEGER UNIQUE,
      invoice_id TEXT,
      amount_micros INTEGER,
      to_address TEXT,
      status TEXT,
      tx_signature TEXT,
      created_at INTEGER
    );
  `);
  return db;
}

function creditOnce(db, invoiceId, signature, amountBaseUnits, status) {
  const existing = db.prepare(`SELECT COUNT(*) AS n FROM payments WHERE invoice_id = ?`).get(invoiceId).n;
  const isExtra = existing > 0;
  const refundDue = isExtra || status === "overpaid";
  db.prepare(
    `INSERT INTO payments (invoice_id, tx_signature, amount_base_units, status, refund_due, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(invoiceId, signature, amountBaseUnits, status, refundDue ? 1 : 0, Date.now() + existing);
}

function listDue(db) {
  return db.prepare(`
    SELECT
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
    ORDER BY p.created_at ASC
  `).all().map((r) => ({ ...r, is_extra: !!r.is_extra }));
}

function refundBaseUnits(payment, invoiceAmountBaseUnits) {
  const received = BigInt(payment.amount_base_units);
  if (payment.is_extra) return received;
  if (payment.status === "overpaid") return received - BigInt(invoiceAmountBaseUnits);
  return received;
}

function beginRefundAttempt(db, paymentId, invoiceId, micros, to) {
  const txn = db.transaction(() => {
    const existing = db.prepare(`SELECT id, status FROM refunds WHERE payment_id = ?`).get(paymentId);
    if (existing && existing.status !== "failed") return { id: existing.id, status: existing.status, started: false };
    if (existing) {
      db.prepare(
        `UPDATE refunds
         SET invoice_id = ?, amount_micros = ?, to_address = ?, status = 'pending', tx_signature = NULL
         WHERE id = ?`,
      ).run(invoiceId, micros, to, existing.id);
      return { id: existing.id, status: "pending", started: true };
    }
    const id = `refund-${paymentId}`;
    db.prepare(
      `INSERT INTO refunds (id, payment_id, invoice_id, amount_micros, to_address, status, tx_signature, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?)`,
    ).run(id, paymentId, invoiceId, micros, to, Date.now());
    return { id, status: "pending", started: true };
  });
  return txn();
}

function markSent(db, refundId, paymentId, signature) {
  const txn = db.transaction(() => {
    db.prepare(`UPDATE refunds SET status = 'sent', tx_signature = ? WHERE id = ?`).run(signature, refundId);
    db.prepare(`UPDATE payments SET refund_due = 0 WHERE id = ?`).run(paymentId);
  });
  txn();
}

function markManual(db, refundId, paymentId) {
  const txn = db.transaction(() => {
    db.prepare(`UPDATE refunds SET status = 'manual_required' WHERE id = ?`).run(refundId);
    db.prepare(`UPDATE payments SET refund_due = 0 WHERE id = ?`).run(paymentId);
  });
  txn();
}

function markFailed(db, refundId) {
  db.prepare(`UPDATE refunds SET status = 'failed' WHERE id = ?`).run(refundId);
}

test("refunds — first-payment overpay is flagged and refunds only the excess", () => {
  const db = freshDb();
  creditOnce(db, "inv1", "sig1", "15000000", "overpaid");
  const due = listDue(db);
  assert.equal(due.length, 1);
  assert.equal(due[0].is_extra, false);
  assert.equal(refundBaseUnits(due[0], "10000000"), 5_000_000n);
});

test("refunds — double-pay is flagged and refunds the full extra payment", () => {
  const db = freshDb();
  creditOnce(db, "inv1", "sig1", "10000000", "exact");
  creditOnce(db, "inv1", "sig2", "10000000", "exact");
  const due = listDue(db);
  assert.equal(due.length, 1);
  assert.equal(due[0].tx_signature, "sig2");
  assert.equal(due[0].is_extra, true);
  assert.equal(refundBaseUnits(due[0], "10000000"), 10_000_000n);
});

test("refunds — sent payout is recorded once and clears refund_due", () => {
  const db = freshDb();
  creditOnce(db, "inv1", "sig1", "15000000", "overpaid");
  const payment = listDue(db)[0];
  const attempt = beginRefundAttempt(db, payment.payment_id, "inv1", 5_000_000, "PayerAddr");
  assert.equal(attempt.started, true);
  assert.equal(beginRefundAttempt(db, payment.payment_id, "inv1", 5_000_000, "PayerAddr").started, false);
  markSent(db, attempt.id, payment.payment_id, "refundSig");
  assert.equal(db.prepare(`SELECT COUNT(*) n FROM refunds`).get().n, 1);
  assert.deepEqual(db.prepare(`SELECT status, tx_signature FROM refunds`).get(), { status: "sent", tx_signature: "refundSig" });
  assert.equal(db.prepare(`SELECT refund_due r FROM payments WHERE id = ?`).get(payment.payment_id).r, 0);
  assert.equal(listDue(db).length, 0);
});

test("refunds — failed payout remains due and retries the same refund row", () => {
  const db = freshDb();
  creditOnce(db, "inv1", "sig1", "15000000", "overpaid");
  const payment = listDue(db)[0];
  const attempt = beginRefundAttempt(db, payment.payment_id, "inv1", 5_000_000, "PayerAddr");
  markFailed(db, attempt.id);
  assert.equal(listDue(db).length, 1);
  const retry = beginRefundAttempt(db, payment.payment_id, "inv1", 5_000_000, "PayerAddr");
  assert.equal(retry.started, true);
  assert.equal(retry.id, attempt.id);
  assert.equal(db.prepare(`SELECT COUNT(*) n FROM refunds`).get().n, 1);
});

test("refunds — manual-required record clears refund_due without a tx signature", () => {
  const db = freshDb();
  creditOnce(db, "inv1", "sig1", "15000000", "overpaid");
  const payment = listDue(db)[0];
  const attempt = beginRefundAttempt(db, payment.payment_id, "inv1", 5_000_000, null);
  markManual(db, attempt.id, payment.payment_id);
  assert.deepEqual(db.prepare(`SELECT status, tx_signature FROM refunds`).get(), { status: "manual_required", tx_signature: null });
  assert.equal(listDue(db).length, 0);
});
