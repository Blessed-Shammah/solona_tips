"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Me {
  id: string;
  name: string;
  email: string | null;
  plan: string;
  api_key: string;
  balance_usd: string;
  balance_micros: number;
  created_at: number;
  usage: { calls: number; spent_usd: string };
}

function formatUsdMicros(micros: number): string {
  const cents = Math.round(micros / 10_000);
  const sign = cents < 0 ? "-" : "";
  const absCents = Math.abs(cents);
  const dollars = Math.floor(absCents / 100).toLocaleString();
  const centsPart = String(absCents % 100).padStart(2, "0");
  return `${sign}${dollars}.${centsPart}`;
}

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<"loading" | "in" | "out">("loading");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (d.error) { setState("out"); return; }
      setMe(d); setState("in");
    });
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (state === "loading") return <main className="wrap"><p className="muted" style={{ marginTop: 24 }}>Loading your profile…</p></main>;

  if (state === "out" || !me) {
    return (
      <main className="wrap" style={{ maxWidth: 440 }}>
        <p className="tag" style={{ marginTop: 24 }}>Your profile</p>
        <div className="card">
          <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)", textTransform: "uppercase" }}>Not signed in</h3>
          <p className="muted">Sign in to view your account profile and important information.</p>
          <div className="row" style={{ marginTop: 18 }}>
            <Link href="/login"><button style={{ marginTop: 0 }}>Sign in</button></Link>
            <Link href="/signup"><button className="secondary" style={{ marginTop: 0 }}>Create account</button></Link>
          </div>
        </div>
      </main>
    );
  }

  const initial = (me.name || me.email || "?").trim().charAt(0).toUpperCase();
  const memberSince = new Date(me.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <main className="wrap" style={{ maxWidth: 640 }}>
      <p className="tag" style={{ marginTop: 24 }}>Your profile</p>

      {/* Identity header */}
      <div className="card profile-identity" style={{ marginBottom: 16 }}>
        <div className="profile-avatar">{initial}</div>
        <div className="profile-summary">
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800 }}>{me.name}</div>
          <div className="muted" style={{ fontSize: 14 }}>{me.email || "—"}</div>
        </div>
        <span className={`pill ${me.plan === "pro" ? "mainnet" : "devnet"}`}><span className="dot" />{me.plan.toUpperCase()}</span>
      </div>

      {/* Account info */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)", textTransform: "uppercase" }}>Account</h3>
        <div className="kv"><span>Email</span><span>{me.email || "—"}</span></div>
        <div className="kv"><span>Plan</span><span>{me.plan === "pro" ? "Pro" : "Free"}</span></div>
        <div className="kv"><span>Member since</span><span>{memberSince}</span></div>
        <div className="kv"><span>Account ID</span><span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{me.id}</span></div>
      </div>

      {/* Balance + usage */}
      <div className="stats" style={{ border: "1px solid var(--ink)", marginBottom: 16 }}>
        <div className="stat"><div className="num">${formatUsdMicros(me.balance_micros)}</div><div className="lbl">Credit balance</div></div>
        <div className="stat"><div className="num">{me.usage.calls}</div><div className="lbl">Tool calls</div></div>
        <div className="stat"><div className="num">${me.usage.spent_usd}</div><div className="lbl">Total spent</div></div>
      </div>

      {/* API key */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)", textTransform: "uppercase" }}>API key</h3>
        <div className="kv">
          <span><code style={{ fontSize: 12 }}>{me.api_key.slice(0, 16)}…{me.api_key.slice(-4)}</code></span>
          <span>
            <button className="secondary" style={{ marginTop: 0, width: "auto", padding: "4px 12px", fontSize: 12 }}
              onClick={() => { navigator.clipboard.writeText(me.api_key); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>
              {copied ? "Copied" : "Copy"}
            </button>
          </span>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>Manage credits, upgrade, and rotate your key in the <Link href="/developers">developer console</Link>.</p>
      </div>

      <div className="row">
        <Link href="/developers"><button style={{ marginTop: 0 }}>Open console</button></Link>
        <button className="secondary" style={{ marginTop: 0 }} onClick={logout}>Log out</button>
      </div>
    </main>
  );
}
