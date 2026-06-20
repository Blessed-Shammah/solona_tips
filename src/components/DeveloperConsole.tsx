"use client";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import Modal from "./Modal";

interface Tool { slug: string; name: string; description: string; price_usd: string; input: Record<string, string>; }
interface Account { id: string; plan: string; balance_usd: string; email?: string | null; }

export default function DeveloperConsole() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [usage, setUsage] = useState<Array<{ tool: string; cost_usd: string; at: number }>>([]);
  const [authState, setAuthState] = useState<"loading" | "in" | "out">("loading");

  const headers = useCallback(
    (): Record<string, string> => ({ "content-type": "application/json", authorization: `Bearer ${apiKey}` }),
    [apiKey],
  );

  const refresh = useCallback(async () => {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (me.error) { setAuthState("out"); return; }
    setApiKey(me.api_key);
    setAccount(me);
    setAuthState("in");
    if (me.api_key) {
      const u = await fetch("/api/account/usage", { headers: { authorization: `Bearer ${me.api_key}` } }).then((r) => r.json());
      if (u.usage) setUsage(u.usage);
    }
  }, []);

  useEffect(() => {
    fetch("/api/tools").then((r) => r.json()).then((d) => setTools(d.tools || []));
    refresh();
  }, [refresh]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setApiKey(null); setAccount(null); setUsage([]); setAuthState("out");
  }

  if (authState === "loading") {
    return <div className="card"><p className="muted">Loading your console…</p></div>;
  }
  if (authState === "out" || !apiKey) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)", textTransform: "uppercase" }}>Sign in to build</h3>
        <p className="muted">Create a developer account (or sign in) to get an API key, top up credits, and call tools.</p>
        <div className="row" style={{ marginTop: 18 }}>
          <a href="/signup"><button style={{ marginTop: 0 }}>Create account</button></a>
          <a href="/login"><button className="secondary" style={{ marginTop: 0 }}>Sign in</button></a>
        </div>
      </div>
    );
  }

  function onKeyRotated(k: string) { setApiKey(k); }

  return (
    <>
      <AccountCard apiKey={apiKey} account={account} onReset={logout} onRefresh={refresh} headers={headers} onKeyRotated={onKeyRotated} />
      <TopUp headers={headers} onApplied={refresh} />
      <ToolRunner tools={tools} headers={headers} onRan={refresh} />
      <UsageList usage={usage} />
    </>
  );
}

function AccountCard({ apiKey, account, onReset, onRefresh, headers, onKeyRotated }: { apiKey: string; account: Account | null; onReset: () => void; onRefresh: () => void; headers: () => Record<string, string>; onKeyRotated: (k: string) => void; }) {
  const [copied, setCopied] = useState(false);
  const [upg, setUpg] = useState<{ orderId: string; payUri: string; price_usd: string } | null>(null);
  const [upgQr, setUpgQr] = useState("");
  const [upgStatus, setUpgStatus] = useState("");
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [rotating, setRotating] = useState(false);

  async function startUpgrade() {
    const r = await fetch("/api/account/upgrade", { method: "POST", headers: headers() });
    const d = await r.json();
    if (d.error) { setUpgStatus("⚠ " + d.error); return; }
    setUpg(d);
    setUpgQr(await QRCode.toDataURL(d.payUri, { margin: 1, width: 180 }));
  }
  async function rotate() {
    setRotating(true);
    const d = await fetch("/api/account/rotate-key", { method: "POST", headers: headers() }).then((r) => r.json());
    setRotating(false);
    setConfirmRotate(false);
    if (d.api_key) onKeyRotated(d.api_key);
  }
  useEffect(() => {
    if (!upg) return;
    const t = setInterval(async () => {
      const d = await fetch(`/api/account/upgrade/${upg.orderId}/status`).then((r) => r.json());
      setUpgStatus(`Payment: ${d.status}${d.applied ? " · upgraded ✅" : ""}`);
      if (d.status === "settled") { clearInterval(t); onRefresh(); setTimeout(() => setUpg(null), 1500); }
    }, 3000);
    return () => clearInterval(t);
  }, [upg, onRefresh]);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="kv"><span>API key</span><span>
        <code style={{ fontSize: 12 }}>{apiKey.slice(0, 14)}…{apiKey.slice(-4)}</code>{" "}
        <button className="secondary" style={{ marginTop: 0, width: "auto", padding: "2px 10px", fontSize: 12 }}
          onClick={() => { navigator.clipboard.writeText(apiKey); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>
          {copied ? "Copied" : "Copy"}
        </button>{" "}
        <button className="secondary" style={{ marginTop: 0, width: "auto", padding: "2px 10px", fontSize: 12 }} onClick={() => setConfirmRotate(true)}>Rotate</button>
      </span></div>
      <div className="kv"><span>Balance</span><span className="amount" style={{ fontSize: 22 }}>${account?.balance_usd ?? "—"}</span></div>
      <div className="kv"><span>Plan</span><span>
        <span className={`pill ${account?.plan === "pro" ? "mainnet" : "devnet"}`}><span className="dot" />{(account?.plan ?? "free").toUpperCase()}</span>
        {account?.plan === "free" && !upg && <button className="secondary" style={{ marginTop: 0, width: "auto", padding: "2px 10px", marginLeft: 8, fontSize: 12 }} onClick={startUpgrade}>Upgrade to Pro</button>}
      </span></div>

      {upg && (
        <div className="center" style={{ marginTop: 12 }}>
          <div className="muted">Pay ${upg.price_usd} USDC to unlock Pro:</div>
          {upgQr && <div className="qr" style={{ margin: "10px auto" }}><img src={upgQr} alt="upgrade QR" style={{ width: 180, height: 180 }} /></div>}
          <div><a href={upg.payUri}><button type="button" style={{ maxWidth: 220 }}>Open in wallet</button></a></div>
          <div className="status pending" style={{ marginTop: 10 }}><span className="dot" />{upgStatus || "Waiting for payment…"}</div>
        </div>
      )}
      {!upg && upgStatus && <div className="err">{upgStatus}</div>}

      <button className="secondary" onClick={onReset}>Log out</button>

      <Modal
        open={confirmRotate}
        title="Rotate API key?"
        danger
        busy={rotating}
        confirmLabel="Rotate key"
        onConfirm={rotate}
        onCancel={() => setConfirmRotate(false)}
      >
        Your current key stops working <strong>immediately</strong>. Any integrations using it must be
        updated with the new key.
      </Modal>
    </div>
  );
}

function TopUp({ headers, onApplied }: { headers: () => Record<string, string>; onApplied: () => void; }) {
  const [amount, setAmount] = useState("1.00");
  const [order, setOrder] = useState<{ orderId: string; payUri: string; amountDecimal: string } | null>(null);
  const [qr, setQr] = useState("");
  const [status, setStatus] = useState("");

  async function start() {
    setStatus("");
    const r = await fetch("/api/credits/topup", { method: "POST", headers: headers(), body: JSON.stringify({ amount }) });
    const d = await r.json();
    if (d.error) { setStatus("⚠ " + d.error); return; }
    setOrder(d);
    setQr(await QRCode.toDataURL(d.payUri, { margin: 1, width: 200 }));
  }

  useEffect(() => {
    if (!order) return;
    const t = setInterval(async () => {
      const d = await fetch(`/api/credits/${order.orderId}/status`).then((r) => r.json());
      setStatus(`Payment: ${d.status}${d.applied ? " · credited ✅" : ""}`);
      if (d.status === "settled") { clearInterval(t); onApplied(); setTimeout(() => setOrder(null), 1500); }
    }, 3000);
    return () => clearInterval(t);
  }, [order, onApplied]);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>Top up credits</h3>
      {!order ? (
        <div className="row">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
          <button style={{ marginTop: 0 }} onClick={start}>Buy ${amount} USDC credits</button>
        </div>
      ) : (
        <div className="center">
          <div className="muted">Pay ${order.amountDecimal} USDC to fund your balance:</div>
          {qr && <div className="qr" style={{ margin: "12px auto" }}><img src={qr} alt="pay QR" style={{ width: 200, height: 200 }} /></div>}
          <div><a href={order.payUri}><button type="button" style={{ maxWidth: 260 }}>Open in wallet</button></a></div>
          <div className="status pending" style={{ marginTop: 12 }}><span className="dot" />{status || "Waiting for payment…"}</div>
        </div>
      )}
      {!order && status && <div className="err">{status}</div>}
    </div>
  );
}

function ToolRunner({ tools, headers, onRan }: { tools: Tool[]; headers: () => Record<string, string>; onRan: () => void; }) {
  const [slug, setSlug] = useState(tools[0]?.slug ?? "");
  const [input, setInput] = useState("{}");
  const [out, setOut] = useState("");
  useEffect(() => { if (!slug && tools[0]) setSlug(tools[0].slug); }, [tools, slug]);
  const tool = tools.find((t) => t.slug === slug);

  async function run() {
    setOut("running…");
    let parsed: unknown = {};
    try { parsed = JSON.parse(input || "{}"); } catch { setOut("⚠ input must be valid JSON"); return; }
    const r = await fetch(`/api/tools/${slug}/invoke`, { method: "POST", headers: headers(), body: JSON.stringify({ input: parsed }) });
    const d = await r.json();
    setOut(JSON.stringify(d, null, 2));
    onRan();
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>Run a tool</h3>
      <div className="row">
        <select value={slug} onChange={(e) => setSlug(e.target.value)}>
          {tools.map((t) => <option key={t.slug} value={t.slug}>{t.name} — ${t.price_usd}/call</option>)}
        </select>
      </div>
      {tool && <div className="hint">{tool.description}<br />Input shape: <code>{JSON.stringify(tool.input)}</code></div>}
      <label>Input (JSON)</label>
      <textarea rows={3} value={input} onChange={(e) => setInput(e.target.value)} placeholder='{"text":"hello"}' />
      <button onClick={run}>Call {tool?.name ?? "tool"} (charges ${tool?.price_usd})</button>
      {out && <pre style={{ background: "#0A0A0A", color: "#E5E5E0", border: "1px solid #0A0A0A", borderRadius: 0, padding: 14, overflow: "auto", fontSize: 12, marginTop: 12, fontFamily: "var(--font-mono)", boxShadow: "var(--shadow-hard-sm)" }}>{out}</pre>}
    </div>
  );
}

function UsageList({ usage }: { usage: Array<{ tool: string; cost_usd: string; at: number }> }) {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Recent calls</h3>
      {usage.length === 0 ? <p className="muted">No calls yet. Top up, then run a tool.</p> :
        usage.map((u, i) => (
          <div className="kv" key={i}><span>{u.tool}</span><span>${u.cost_usd} · {new Date(u.at).toLocaleTimeString()}</span></div>
        ))}
    </div>
  );
}
