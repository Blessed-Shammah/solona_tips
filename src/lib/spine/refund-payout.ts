import {
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createKeyPairSignerFromPrivateKeyBytes,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  signature as toSignature,
} from "@solana/kit";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferCheckedInstruction,
} from "@solana-program/token";
import { rpc, toAddress } from "../solana";

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE58_INDEX = new Map([...BASE58_ALPHABET].map((c, i) => [c, i]));

export function refundSignerEnabled(): boolean {
  return !!process.env.MERCHANT_SECRET_KEY?.trim();
}

export function parseMerchantSecretKey(raw: string): Uint8Array {
  const value = raw.trim();
  if (!value) throw new Error("MERCHANT_SECRET_KEY is empty");

  if (value.startsWith("[")) {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) throw new Error("MERCHANT_SECRET_KEY JSON must be an array of bytes");
    return validateSecretBytes(Uint8Array.from(parsed.map((n) => {
      if (!Number.isInteger(n) || n < 0 || n > 255) throw new Error("MERCHANT_SECRET_KEY contains an invalid byte");
      return n;
    })));
  }

  if (/^[1-9A-HJ-NP-Za-km-z]+$/.test(value)) {
    const decoded = decodeBase58(value);
    if (decoded.length === 32 || decoded.length === 64) return decoded;
  }

  const base64 = Buffer.from(value, "base64");
  return validateSecretBytes(base64);
}

async function merchantSignerFor(merchantAddress: string) {
  const secret = process.env.MERCHANT_SECRET_KEY;
  if (!secret?.trim()) throw new Error("MERCHANT_SECRET_KEY is not configured");
  const bytes = parseMerchantSecretKey(secret);
  const signer = bytes.length === 32
    ? await createKeyPairSignerFromPrivateKeyBytes(bytes)
    : await createKeyPairSignerFromBytes(bytes);
  if (String(signer.address) !== merchantAddress) {
    throw new Error("MERCHANT_SECRET_KEY does not match MERCHANT_ADDRESS");
  }
  return signer;
}

export interface TokenRefundInput {
  merchantAddress: string;
  payerAddress: string;
  mint: string;
  tokenProgram: string;
  amountBaseUnits: bigint;
  decimals: number;
}

export async function sendTokenRefund(input: TokenRefundInput): Promise<string> {
  if (input.amountBaseUnits <= 0n) throw new Error("Refund amount must be greater than zero");

  const merchant = toAddress(input.merchantAddress);
  const payer = toAddress(input.payerAddress);
  const mint = toAddress(input.mint);
  const tokenProgram = toAddress(input.tokenProgram);
  const signer = await merchantSignerFor(input.merchantAddress);

  const [sourceAta] = await findAssociatedTokenPda({ owner: merchant, tokenProgram, mint });
  const [destinationAta] = await findAssociatedTokenPda({ owner: payer, tokenProgram, mint });
  const { value: latestBlockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();

  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(signer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) => appendTransactionMessageInstructions([
      getCreateAssociatedTokenIdempotentInstruction({
        payer: signer,
        ata: destinationAta,
        owner: payer,
        mint,
        tokenProgram,
      }),
      getTransferCheckedInstruction({
        source: sourceAta,
        mint,
        destination: destinationAta,
        authority: signer,
        amount: input.amountBaseUnits,
        decimals: input.decimals,
      }, { programAddress: tokenProgram }),
    ], m),
  );

  const signed = await signTransactionMessageWithSigners(transactionMessage);
  const signature = getSignatureFromTransaction(signed);
  await rpc.sendTransaction(getBase64EncodedWireTransaction(signed), {
    encoding: "base64",
    maxRetries: 3n,
    preflightCommitment: "confirmed",
  }).send();
  await waitForSignature(signature);
  return String(signature);
}

async function waitForSignature(signature: string, timeoutMs = 60_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { value: statuses } = await rpc.getSignatureStatuses([toSignature(signature)]).send();
    const [status] = statuses;
    if (status?.err) throw new Error(`Refund transaction failed: ${JSON.stringify(status.err)}`);
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") return;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error("Timed out waiting for refund transaction confirmation");
}

function validateSecretBytes(bytes: Uint8Array): Uint8Array {
  if (bytes.length !== 32 && bytes.length !== 64) {
    throw new Error("MERCHANT_SECRET_KEY must decode to a 32-byte private key or 64-byte Solana secret key");
  }
  return bytes;
}

function decodeBase58(value: string): Uint8Array {
  const bytes = [0];
  for (const char of value) {
    const carryStart = BASE58_INDEX.get(char);
    if (carryStart === undefined) throw new Error("MERCHANT_SECRET_KEY is not valid base58");
    let carry = carryStart;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const char of value) {
    if (char !== "1") break;
    bytes.push(0);
  }
  return Uint8Array.from(bytes.reverse());
}
