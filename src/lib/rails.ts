// rails.ts — choose a stablecoin/SOL rail and resolve its on-chain truth.
// Mints are taken from solana-payments-skill/skill/references/resources.md (verified 2026-06-19),
// but decimals and the owning token program are ALWAYS re-read from the mint on-chain
// (Safety Laws #2 + #3). Never trust the table for transfer math.
import { rpc, toAddress } from "./solana";
import { config, type Cluster } from "./config";
import { SPL_TOKEN_PROGRAM, TOKEN_2022_PROGRAM, NATIVE_SOL } from "./payments-core.mjs";

export type RailId = "USDC" | "USDG" | "PYUSD" | "SOL";

export interface RailDef {
  id: RailId;
  label: string;
  mint: string | null; // null = native SOL
  /** Fallback decimals for display before on-chain resolution; verification re-reads on-chain. */
  fallbackDecimals: number;
}

// Known mints per cluster. Only addresses we can verify are listed (resources.md discipline:
// never write a guessed address into payments code).
const RAILS_BY_CLUSTER: Record<Cluster, RailDef[]> = {
  mainnet: [
    { id: "USDC", label: "USD Coin", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", fallbackDecimals: 6 },
    { id: "USDG", label: "Global Dollar", mint: "2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH", fallbackDecimals: 6 },
    { id: "PYUSD", label: "PayPal USD", mint: "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo", fallbackDecimals: 6 },
    { id: "SOL", label: "Solana", mint: null, fallbackDecimals: 9 },
  ],
  devnet: [
    // Circle's canonical devnet USDC faucet mint.
    { id: "USDC", label: "USD Coin (devnet)", mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", fallbackDecimals: 6 },
    { id: "SOL", label: "Solana (devnet)", mint: null, fallbackDecimals: 9 },
  ],
};

export function listRails(): RailDef[] {
  return RAILS_BY_CLUSTER[config.cluster];
}

export function getRail(id: string): RailDef | undefined {
  return listRails().find((r) => r.id === id);
}

export interface ResolvedRail {
  id: RailId;
  label: string;
  mint: string; // NATIVE_SOL sentinel for SOL
  decimals: number;
  tokenProgram: string; // owning program (SPL or Token-2022); NATIVE_SOL for SOL
  isNative: boolean;
}

// Cache resolution — a mint's program & decimals are immutable.
const resolveCache = new Map<string, ResolvedRail>();

/**
 * Resolve a rail to { decimals, tokenProgram } by reading the mint account on-chain.
 * The mint account's OWNER is the token program to use for transfers + ATA derivation.
 * Decimals live at byte offset 44 of the Mint struct (same for SPL Token and Token-2022 base).
 */
export async function resolveRail(id: string): Promise<ResolvedRail> {
  const def = getRail(id);
  if (!def) throw new Error(`Unknown or unsupported rail for this cluster: ${id}`);

  if (def.mint === null) {
    return { id: def.id, label: def.label, mint: NATIVE_SOL, decimals: 9, tokenProgram: NATIVE_SOL, isNative: true };
  }

  const cached = resolveCache.get(def.mint);
  if (cached) return cached;

  const { value } = await rpc.getAccountInfo(toAddress(def.mint), { encoding: "base64" }).send();
  if (!value) throw new Error(`Mint ${def.mint} not found on ${config.cluster}. Wrong cluster/RPC?`);

  const owner = value.owner as string;
  if (owner !== SPL_TOKEN_PROGRAM && owner !== TOKEN_2022_PROGRAM) {
    throw new Error(`Mint ${def.mint} is not owned by a token program (owner=${owner}).`);
  }

  const data = Buffer.from(value.data[0], "base64");
  // Mint layout: mint_authority COption<Pubkey> (36) + supply u64 (8) = 44, then decimals u8.
  const decimals = data.length > 44 ? data.readUInt8(44) : def.fallbackDecimals;

  const resolved: ResolvedRail = {
    id: def.id,
    label: def.label,
    mint: def.mint,
    decimals,
    tokenProgram: owner,
    isNative: false,
  };
  resolveCache.set(def.mint, resolved);
  return resolved;
}

export function isToken2022(tokenProgram: string): boolean {
  return tokenProgram === TOKEN_2022_PROGRAM;
}
