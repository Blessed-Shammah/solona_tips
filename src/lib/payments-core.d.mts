// Type declarations for the zero-dependency payments-core.mjs.

export const SPL_TOKEN_PROGRAM: string;
export const TOKEN_2022_PROGRAM: string;
export const NATIVE_SOL: "native-sol";

export type PaymentStatus = "underpaid" | "overpaid" | "exact";

export interface TokenBalance {
  owner: string;
  mint: string;
  uiTokenAmount?: { amount: string };
  amount?: string;
}

export interface TxMeta {
  err?: unknown;
  preTokenBalances?: TokenBalance[];
  postTokenBalances?: TokenBalance[];
  preBalances?: (number | string)[];
  postBalances?: (number | string)[];
}

export interface VerifiableTx {
  meta?: TxMeta;
  tokenProgram?: string;
  signature: string;
  err?: unknown;
}

export interface VerifyOk {
  ok: boolean;
  status?: PaymentStatus;
  received?: bigint;
  signature?: string;
  reason?: string;
}

export function toBaseUnits(amountDecimal: string, decimals: number): bigint;
export function fromBaseUnits(baseUnits: bigint | string | number, decimals: number): string;

export function buildSolanaPayUrl(args: {
  recipient: string;
  amountDecimal: string;
  mint?: string;
  reference: string;
  label?: string;
  message?: string;
  memo?: string;
}): string;

export function tokenBalanceDelta(meta: TxMeta | undefined, owner: string, mint: string): bigint;
export function lamportDelta(meta: TxMeta | undefined, accountIndex: number): bigint;
export function classifyPayment(received: bigint | string | number, expected: bigint | string | number): PaymentStatus;

export function verifyTransfer(
  tx: VerifiableTx,
  opts: { mint: string; tokenProgram?: string; merchantOwner: string; expectedBaseUnits: bigint }
): VerifyOk;

export function verifyNativeTransfer(
  tx: VerifiableTx,
  opts: { merchantAccountIndex: number; expectedBaseUnits: bigint }
): VerifyOk;

export interface CreditResult {
  credited: boolean;
  reason?: string;
}

export class Ledger {
  creditOnce(invoiceId: string, signature: string, amount: bigint): CreditResult;
  creditsFor(invoiceId: string): Array<{ invoiceId: string; signature: string; amount: bigint }>;
}

export function settleInvoice(
  ledger: Ledger,
  invoiceId: string,
  verified: { signature: string; received: bigint }
): { action: string; refund?: bigint };
