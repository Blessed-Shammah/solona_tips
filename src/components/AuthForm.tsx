"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isSignup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(isSignup ? { email, password, name } : { email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      router.push("/developers");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="wrap" style={{ maxWidth: 440 }}>
      <p className="tag" style={{ marginTop: 24 }}>{isSignup ? "Create your developer account" : "Sign in to your developer account"}</p>
      <form className="card" onSubmit={submit}>
        {isSignup && (
          <>
            <label htmlFor="name">Account name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My App" />
          </>
        )}
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={isSignup ? "new-password" : "current-password"} placeholder={isSignup ? "At least 8 characters" : ""} />
        <button type="submit" disabled={busy}>{busy ? "…" : isSignup ? "Create account" : "Sign in"}</button>
        {error && <div className="err">⚠ {error}</div>}
      </form>
      <p className="muted" style={{ marginTop: 16 }}>
        {isSignup ? <>Already have an account? <Link href="/login">Sign in</Link></> : <>New here? <Link href="/signup">Create an account</Link></>}
      </p>
    </main>
  );
}
