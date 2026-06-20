// POST /api/contact — store a contact message (rate-limited). GET — admin-only, list messages.
import { NextResponse } from "next/server";
import { saveContactMessage, listContactMessages } from "@/lib/spine/store";
import { rateLimit, clientIp, maybeSweep } from "@/lib/spine/ratelimit";
import { isAdmin } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  maybeSweep();
  const rl = rateLimit(`contact:${clientIp(req)}`, 5, 60 * 60_000); // 5/hour per IP
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many messages — try again later." }, { status: 429 });
  }

  let body: { name?: string; email?: string; subject?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const name = (body.name || "").toString().trim().slice(0, 120);
  const email = (body.email || "").toString().trim().slice(0, 200);
  const subject = (body.subject || "").toString().trim().slice(0, 160);
  const message = (body.message || "").toString().trim().slice(0, 4000);

  if (!name || !EMAIL_RE.test(email) || message.length < 5) {
    return NextResponse.json({ error: "Please provide your name, a valid email, and a message." }, { status: 400 });
  }

  saveContactMessage({ name, email, subject, message });
  return NextResponse.json({ ok: true, message: "Thanks — we’ll get back to you soon." });
}

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ messages: listContactMessages() });
}
