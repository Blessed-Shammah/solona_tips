"use client";
import { useState } from "react";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setMsg("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setState("sent");
      setMsg(data.message || "Thanks — we’ll get back to you soon.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setState("error");
      setMsg((err as Error).message);
    }
  }

  if (state === "sent") {
    return (
      <div className="card center">
        <div className="amount" style={{ fontSize: 30 }}>✅</div>
        <h3 style={{ margin: "8px 0" }}>Message sent</h3>
        <p className="muted">{msg}</p>
        <button className="secondary" style={{ maxWidth: 200, margin: "0 auto" }} onClick={() => setState("idle")}>Send another</button>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="row">
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" value={form.name} onChange={set("name")} required />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={form.email} onChange={set("email")} required />
        </div>
      </div>
      <label htmlFor="subject">Subject</label>
      <input id="subject" value={form.subject} onChange={set("subject")} placeholder="Partnership, support, press…" />
      <label htmlFor="message">Message</label>
      <textarea id="message" rows={5} value={form.message} onChange={set("message")} required placeholder="How can we help?" />
      <button type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send message"}</button>
      {state === "error" && <div className="err">⚠ {msg}</div>}
    </form>
  );
}
