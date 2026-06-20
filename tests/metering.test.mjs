// Spine money-path tests: exactly-once metering, atomic balance debit, and exactly-once credit
// application. Mirrors the production SQL in src/lib/spine/store.ts against an in-memory SQLite.
import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";

function freshDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE accounts (id TEXT PRIMARY KEY, balance_micros INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE usage_records (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id TEXT, call_id TEXT, cost_micros INTEGER, output TEXT);
    CREATE UNIQUE INDEX uniq_call ON usage_records (call_id);
    CREATE TABLE credit_applications (invoice_id TEXT PRIMARY KEY, account_id TEXT, micros INTEGER);
  `);
  return db;
}

class Insufficient extends Error {}

function meterTxn(db, accountId, callId, cost, output) {
  const txn = db.transaction(() => {
    db.prepare(`INSERT INTO usage_records (account_id, call_id, cost_micros, output) VALUES (?,?,?,?)`).run(accountId, callId, cost, output);
    const r = db.prepare(`UPDATE accounts SET balance_micros = balance_micros - ? WHERE id=? AND balance_micros >= ?`).run(cost, accountId, cost);
    if (r.changes === 0) throw new Insufficient();
  });
  txn();
}

function applyCreditOnce(db, invoiceId, accountId, micros) {
  const txn = db.transaction(() => {
    try {
      db.prepare(`INSERT INTO credit_applications (invoice_id, account_id, micros) VALUES (?,?,?)`).run(invoiceId, accountId, micros);
    } catch (e) {
      if (e.code === "SQLITE_CONSTRAINT_PRIMARYKEY") return false;
      throw e;
    }
    db.prepare(`UPDATE accounts SET balance_micros = balance_micros + ? WHERE id=?`).run(micros, accountId);
    return true;
  });
  return txn();
}

test("metering — exactly-once on call_id (idempotency key replays don't double-charge)", () => {
  const db = freshDb();
  db.prepare(`INSERT INTO accounts (id, balance_micros) VALUES ('a', 10000)`).run();
  meterTxn(db, "a", "call-1", 1000, "{}");
  // replay same call_id → unique violation, no second charge
  assert.throws(() => meterTxn(db, "a", "call-1", 1000, "{}"), /UNIQUE|constraint/i);
  const bal = db.prepare(`SELECT balance_micros b FROM accounts WHERE id='a'`).get().b;
  assert.equal(bal, 9000); // charged exactly once
  assert.equal(db.prepare(`SELECT COUNT(*) n FROM usage_records`).get().n, 1);
});

test("metering — insufficient balance rolls back the usage insert (atomic)", () => {
  const db = freshDb();
  db.prepare(`INSERT INTO accounts (id, balance_micros) VALUES ('a', 500)`).run();
  assert.throws(() => meterTxn(db, "a", "call-x", 1000, "{}"), Insufficient);
  // usage row must NOT persist — the transaction rolled back
  assert.equal(db.prepare(`SELECT COUNT(*) n FROM usage_records`).get().n, 0);
  assert.equal(db.prepare(`SELECT balance_micros b FROM accounts WHERE id='a'`).get().b, 500);
});

test("metering — sequential draw-down stops exactly at zero", () => {
  const db = freshDb();
  db.prepare(`INSERT INTO accounts (id, balance_micros) VALUES ('a', 2500)`).run();
  meterTxn(db, "a", "c1", 1000, "{}");
  meterTxn(db, "a", "c2", 1000, "{}");
  assert.throws(() => meterTxn(db, "a", "c3", 1000, "{}"), Insufficient); // only 500 left
  assert.equal(db.prepare(`SELECT balance_micros b FROM accounts WHERE id='a'`).get().b, 500);
});

test("credits — a settled invoice tops up the balance exactly once", () => {
  const db = freshDb();
  db.prepare(`INSERT INTO accounts (id, balance_micros) VALUES ('a', 0)`).run();
  assert.equal(applyCreditOnce(db, "inv-1", "a", 5_000_000), true);  // first apply
  assert.equal(applyCreditOnce(db, "inv-1", "a", 5_000_000), false); // replay (webhook + cron) → no-op
  assert.equal(db.prepare(`SELECT balance_micros b FROM accounts WHERE id='a'`).get().b, 5_000_000);
});
