// POST /api/auth/login — verify email+password, set a session cookie.
import { NextResponse } from "next/server";
import { getAccountByEmail, createSession } from "@/lib/spine/store";
import { verifyPassword, SESSION_COOKIE } from "@/lib/spine/session";
import { rateLimit, clientIp, maybeSweep } from "@/lib/spine/ratelimit";

export async function POST(req: Request) {
  maybeSweep();
  // Tighter limit on login to slow credential stuffing.
  if (!(await rateLimit(`login:${clientIp(req)}`, 12, 15 * 60_000)).allowed) {
    return NextResponse.json({ error: "Too many attempts — try again shortly." }, { status: 429 });
  }

  let body: { email?: string; password?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid request" }, { status: 400 }); }

  const email = (body.email || "").trim().toLowerCase();
  const account = getAccountByEmail(email);
  // Constant-ish path: always run verify to avoid leaking which emails exist.
  const ok = account ? verifyPassword(body.password || "", account.password_hash) : verifyPassword("x", "0:0");
  if (!account || !ok) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

  const token = createSession(account.id);
  const res = NextResponse.json({ id: account.id, email, plan: account.plan, api_key: account.api_key });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 24 * 60 * 60 });
  return res;
}
