// POST /api/auth/signup — create an account with email+password, set a session cookie.
import { NextResponse } from "next/server";
import { createAccount, getAccountByEmail, setCredentials, createSession } from "@/lib/spine/store";
import { hashPassword, SESSION_COOKIE, EMAIL_RE } from "@/lib/spine/session";
import { rateLimit, clientIp, maybeSweep } from "@/lib/spine/ratelimit";

export async function POST(req: Request) {
  maybeSweep();
  if (!rateLimit(`signup:${clientIp(req)}`, 10, 60 * 60_000).allowed) {
    return NextResponse.json({ error: "Too many attempts — try again later." }, { status: 429 });
  }

  let body: { email?: string; password?: string; name?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid request" }, { status: 400 }); }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const name = (body.name || email.split("@")[0] || "My App").slice(0, 80);

  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (getAccountByEmail(email)) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });

  const account = createAccount(name);
  setCredentials(account.id, email, hashPassword(password));
  const token = createSession(account.id);

  const res = NextResponse.json({ id: account.id, email, plan: account.plan, api_key: account.api_key });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 24 * 60 * 60 });
  return res;
}
