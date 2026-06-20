// Refund accounting — exactly-once recording + flag clearing. Mirrors src/lib/spine/store.ts SQL.
import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";

function freshDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE payments (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id TEXT, tx_signature TEXT, amount_base_units TEXT, refund_due INTEGER DEFAULT 0);
    CREATE TABLE refunds (id TEXT PRIMARY KEY, payment_id INTEGER UNIQUE, invoice_id TEXT, amount_micros INTEGER, to_address TEXT, status TEXT, tx_signature TEXT, created_at INTEGER);
  `);
  return db;
}

function recordRefundOnce(db, paymentId, invoiceId, micros, to, status) {
  const txn = db.transaction(() => {
    try {
      db.prepare(`INSERT INTO refunds (id, payment_id, invoice_id, amount_micros, to_address, status, tx_signature, created_at) VALUES (?,?,?,?,?,?,?,?)`)
        .run(String(Math.random()), paymentId, invoiceId, micros, to, status, null, Date.now());
    } catch (e) {
      if (String(e.code).startsWith("SQLITE_CONSTRAINT")) return false;
      throw e;
    }
    db.prepare(`UPDATE payments SET refund_due = 0 WHERE id = ?`).run(paymentId);
    return true;
  });
  return txn();
}

function listDue(db) {
  return db.prepare(`SELECT id AS payment_id FROM payments WHERE refund_due = 1 AND id NOT IN (SELECT payment_id FROM refunds)`).all();
}

test("refunds — a flagged payment is recorded once and its flag cleared", () => {
  const db = freshDb();
  const { lastInsertRowid: pid } = db.prepare(`INSERT INTO payments (invoice_id, tx_signature, amount_base_units, refund_due) VALUES ('inv1','sigX','10000000',1)`).run();
  assert.equal(listDue(db).length, 1);
  assert.equal(recordRefundOnce(db, pid, "inv1", 10_000_000, "PayerAddr", "manual_required"), true);
  assert.equal(recordRefundOnce(db, pid, "inv1", 10_000_000, "PayerAddr", "manual_required"), false); // exactly-once
  assert.equal(db.prepare(`SELECT COUNT(*) n FROM refunds`).get().n, 1);
  assert.equal(db.prepare(`SELECT refund_due r FROM payments WHERE id=?`).get(pid).r, 0); // flag cleared
  assert.equal(listDue(db).length, 0); // no longer due
});

test("refunds — payments without refund_due are never listed", () => {
  const db = freshDb();
  db.prepare(`INSERT INTO payments (invoice_id, tx_signature, amount_base_units, refund_due) VALUES ('inv2','sigY','5000000',0)`).run();
  assert.equal(listDue(db).length, 0);
});
