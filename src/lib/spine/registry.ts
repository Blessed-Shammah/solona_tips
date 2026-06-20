// registry.ts — the rail registry. Code asks for an adapter by id; today only Solana is wired,
// but adding "stripe" here makes every tool support cards with zero changes upstream.
import type { PaymentAdapter } from "./adapter";
import { solanaAdapter } from "./solana-adapter";

const adapters: Record<string, PaymentAdapter> = {
  [solanaAdapter.id]: solanaAdapter,
  // [stripeAdapter.id]: stripeAdapter,   // ← future: cards
  // [ethAdapter.id]: ethAdapter,         // ← future: other chains
};

export const DEFAULT_RAIL = "solana";

export function getAdapter(id: string = DEFAULT_RAIL): PaymentAdapter {
  const a = adapters[id];
  if (!a) throw new Error(`No payment adapter registered for rail "${id}"`);
  return a;
}

export function listRailIds(): string[] {
  return Object.keys(adapters);
}
