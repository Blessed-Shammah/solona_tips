// POST /api/account/rotate-key — issue a new API key and invalidate the old one immediately.
import { NextResponse } from "next/server";
import { accountFromRequest } from "@/lib/spine/api-auth";
import { rotateApiKey } from "@/lib/spine/store";

export async function POST(req: Request) {
  const account = accountFromRequest(req);
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const newKey = rotateApiKey(account.id);
  return NextResponse.json({ id: account.id, api_key: newKey, note: "Old key is now invalid." });
}
