// api-auth.ts — resolve a developer/agent account from its API key.
import { getAccountByApiKey, type Account } from "./store";

export function accountFromRequest(req: Request): Account | undefined {
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const headerKey = req.headers.get("x-api-key")?.trim() || "";
  const key = bearer || headerKey;
  if (!key) return undefined;
  return getAccountByApiKey(key);
}
