"use client";
import { useCallback, useEffect, useState } from "react";

interface Overview {
  stats: Record<string, string | number>;
  accounts: { id: string; name: string; email: string | null; plan: string; balance_usd: string }[];
  invoices: { id: string; rail: string; amount: string; status: string; at: number }[];
  refunds: { id: string; amount_usd: string; to: string | null; status: string }[];
  contact: { name: string; email: string; subject: string; message: string; at: number }[];
}

const SECRET_KEY = "soltip_admin_secret";

export default function AdminPage() {
  const [secret, setSecret] = useState<string>("");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState("");

  const headers = useCallback((): Record<string, string> => (secret ? { authorization: `Bearer ${secret}` } : {}), [secret]);

  const load = useCallback(async (s: string) => {
    const res = await fetch("/api/admin/overview", { headers: s ? { authorization: `Bearer ${s}` } : {} });
    if (res.status === 503) { setNotConfigured(true); setAuthed(false); return; }
    if (res.status === 401) { setAuthed(false); return; }
    setData(await res.json());
    setAuthed(true);
  }, []);

  useEffect(() => {
    const s = sessionStorage.getItem(SECRET_KEY) || "";
    setSecret(s);
    load(s);
  }, [load]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem(SECRET_KEY, secret);
    await load(secret);
  }

  async function action(path: string, label: string) {
    setBusy(label);
    await fetch(path, { method: "POST", headers: headers() });
    await load(secret);
    setBusy("");
  }

  if (notConfigured) {
    return (
      <main className="wrap" style={{ maxWidth: 480 }}>
        <p className="tag" style={{ marginTop: 24 }}>Operator console</p>
        <div className="card warnbox">
          <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)", textTransform: "uppercase" }}>Admin locked</h3>
          <p className="muted">Admin is <strong>not configured</strong>, so it is locked to everyone. Set <code>ADMIN_SECRET</code> on the server and restart, then reload this page to sign in.</p>
        </div>
      </main>
    );
  }
  if (authed === false) {
    return (
      <main className="wrap" style={{ maxWidth: 440 }}>
        <p className="tag" style={{ marginTop: 24 }}>Operator console — enter the admin secret.</p>
        <form className="card" onSubmit={unlock}>
          <label htmlFor="s">Admin secret</label>
          <input id="s" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoFocus />
          <button type="submit">Unlock</button>
        </form>
      </main>
    );
  }
  if (!data) return <main className="wrap"><p className="muted">Loading…</p></main>;

  const s = data.stats;
  return (
    <main className="wrap" style={{ maxWidth: 1000 }}>
      <p className="tag" style={{ marginTop: 24 }}>Operator console</p>

      <div className="stats" style={{ border: "1px solid var(--ink)", marginBottom: 16 }}>
        <div className="stat"><div className="num">{s.accounts}</div><div className="lbl">Accounts ({s.proAccounts} pro)</div></div>
        <div className="stat"><div className="num">{s.toolCalls}</div><div className="lbl">Tool calls</div></div>
        <div className="stat"><div className="num">${s.revenueUsd}</div><div className="lbl">Tool revenue</div></div>
        <div className="stat"><div className="num">${s.creditBalanceHeldUsd}</div><div className="lbl">Credits outstanding</div></div>
        <div className="stat"><div className="num">{s.refundsDue}</div><div className="lbl">Refunds due</div></div>
      </div>

      <div className="row" style={{ marginBottom: 16 }}>
        <button style={{ marginTop: 0 }} disabled={!!busy} onClick={() => action("/api/reconcile", "reconcile")}>{busy === "reconcile" ? "…" : "Run reconcile"}</button>
        <button className="secondary" style={{ marginTop: 0 }} disabled={!!busy} onClick={() => action("/api/refunds", "refunds")}>{busy === "refunds" ? "…" : "Process refunds"}</button>
      </div>

      <Section title="Refunds">
        {data.refunds.length === 0 ? <p className="muted">None.</p> : data.refunds.map((r) => (
          <div className="kv" key={r.id}><span>${r.amount_usd} → {r.to || "payer unknown"}</span><span>{r.status}</span></div>
        ))}
      </Section>

      <Section title="Accounts">
        {data.accounts.map((a) => (
          <div className="kv" key={a.id}><span>{a.email || a.name}</span><span>{a.plan} · ${a.balance_usd}</span></div>
        ))}
      </Section>

      <Section title="Recent invoices">
        {data.invoices.map((i) => (
          <div className="kv" key={i.id}><span>{i.amount} {i.rail}</span><span>{i.status}</span></div>
        ))}
      </Section>

      <Section title="Contact messages">
        {data.contact.length === 0 ? <p className="muted">None.</p> : data.contact.map((c, i) => (
          <div className="kv" key={i} style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
            <span>{c.name} &lt;{c.email}&gt; — {c.subject || "(no subject)"}</span>
            <span style={{ color: "var(--muted)", fontSize: 13 }}>{c.message}</span>
          </div>
        ))}
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)", textTransform: "uppercase" }}>{title}</h3>
      {children}
    </div>
  );
}
