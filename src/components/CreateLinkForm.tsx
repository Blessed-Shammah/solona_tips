"use client";
import { useState } from "react";

interface Rail { id: string; label: string; }
interface Created { id: string; amount: string; rail: string; payPageUrl: string; solanaPayUrl: string; }

export default function CreateLinkForm({
  rails,
  adminProtected,
}: {
  rails: Rail[];
  cluster: string;
  adminProtected: boolean;
}) {
  const [rail, setRail] = useState(rails[0]?.id ?? "USDC");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreated(null);
    setLoading(true);
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (secret) headers["x-admin-secret"] = secret;
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({ rail, amount, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed to create link");
      setCreated(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!created) return;
    await navigator.clipboard.writeText(created.payPageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <form onSubmit={submit}>
      <div className="row">
        <div>
          <label htmlFor="rail">Currency</label>
          <select id="rail" value={rail} onChange={(e) => setRail(e.target.value)}>
            {rails.map((r) => (
              <option key={r.id} value={r.id}>{r.id} — {r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            inputMode="decimal"
            placeholder="10.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
      </div>

      <label htmlFor="message">Note (optional)</label>
      <input
        id="message"
        placeholder="Invoice #1024 / Tip for design work"
        value={message}
        maxLength={120}
        onChange={(e) => setMessage(e.target.value)}
      />

      {adminProtected && (
        <>
          <label htmlFor="secret">Admin secret</label>
          <input id="secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} />
        </>
      )}

      <button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create payment link"}
      </button>

      {error && <div className="err">⚠ {error}</div>}

      {created && (
        <div className="result">
          <div className="muted">Share this link — it shows a QR + pay button and auto-confirms.</div>
          <div className="linkbox">
            <input readOnly value={created.payPageUrl} onFocus={(e) => e.target.select()} />
            <button type="button" className="secondary" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
          </div>
          <div className="hint">
            Requesting <strong>{created.amount} {created.rail}</strong>. Open the link yourself to
            preview it →{" "}
            <a href={created.payPageUrl} target="_blank" rel="noreferrer">/pay/{created.id.slice(0, 8)}…</a>
          </div>
        </div>
      )}
    </form>
  );
}
