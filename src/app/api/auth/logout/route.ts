// POST /api/auth/logout — delete the session and clear the cookie.
import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/spine/store";
import { SESSION_COOKIE } from "@/lib/spine/session";

export async function POST(req: Request) {
  const cookie = (req.headers.get("cookie") || "").split(";").map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (cookie) deleteSession(decodeURIComponent(cookie.split("=").slice(1).join("=")));
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
