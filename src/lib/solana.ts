// Solana RPC client. Normal settlement is read-only; live refunds sign only inside the
// MERCHANT_SECRET_KEY-backed refund payout adapter (Safety Law #7: no keys in code/logs).
import { createSolanaRpc, address, type Address } from "@solana/kit";
import { config } from "./config";

export const rpc = createSolanaRpc(config.rpcUrl);

export function toAddress(s: string): Address {
  return address(s);
}
