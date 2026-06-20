// Solana RPC client (read-only). This app NEVER signs — it only watches the chain to confirm
// that funds landed in the merchant wallet (Safety Law #7: non-custodial, no private keys).
import { createSolanaRpc, address, type Address } from "@solana/kit";
import { config } from "./config";

export const rpc = createSolanaRpc(config.rpcUrl);

export function toAddress(s: string): Address {
  return address(s);
}
