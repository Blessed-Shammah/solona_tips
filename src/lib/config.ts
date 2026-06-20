// Central config, read once from the environment. Fails loud on missing critical values.

export type Cluster = "devnet" | "mainnet";

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required env var ${name}. Copy .env.example to .env.local and fill it in.`);
  }
  return v.trim();
}

export const config = {
  cluster: ((process.env.SOLANA_CLUSTER || "devnet").trim() as Cluster),
  rpcUrl: (process.env.RPC_URL || "https://api.devnet.solana.com").trim(),
  merchantLabel: (process.env.MERCHANT_LABEL || "SolTip").trim(),
  adminSecret: (process.env.ADMIN_SECRET || "").trim(),
  databasePath: (process.env.DATABASE_PATH || "./data/soltip.db").trim(),

  // Lazily required so the test/build paths don't crash before it's configured.
  get merchantAddress(): string {
    return required("MERCHANT_ADDRESS");
  },
};

export function isMainnet(): boolean {
  return config.cluster === "mainnet";
}

// Value tiers map to commitment levels (confirmation.md). High-value waits for finality.
// Tune the threshold to your risk appetite.
export function commitmentForAmount(amountUsd: number): "confirmed" | "finalized" {
  return amountUsd >= 1000 ? "finalized" : "confirmed";
}
