// adapter.ts — the spine's payment abstraction. THE moat lives behind this interface.
// Every tool and feature calls `charge()` / `verify()` and never knows or cares which rail moved
// the money. Solana is the first adapter (solana-adapter.ts); cards (Stripe), other chains, and
// bank rails (ACH/SEPA/UPI) are future adapters implementing this same contract.
//
// CEO rule (PLATFORM.md): nothing above this layer may import a chain/provider SDK directly.

export interface ChargeRequest {
  /** Decimal amount as a string, e.g. "0.50". The adapter resolves rail decimals itself. */
  amountDecimal: string;
  /** Stable correlation id for this charge (invoice/credit-order id). */
  orderId: string;
  /** Human-readable note shown to the payer / in their wallet. */
  memo?: string;
  /** Optional rail hint (e.g. "USDC", "SOL"). Adapter picks a sane default otherwise. */
  rail?: string;
}

export interface ChargeHandle {
  /** Adapter-opaque id the caller persists to later verify settlement. */
  reference: string;
  /** Everything a payer/agent needs to fulfill the charge (URL, QR source, hosted page…). */
  instructions: {
    /** Canonical pay URI (Solana Pay URL today; provider checkout URL for card rails). */
    payUri: string;
    rail: string;
    amountDecimal: string;
    recipient: string;
    expiresAt: number;
  };
}

export interface VerifiedSettlement {
  status: "pending" | "settled" | "underpaid" | "expired";
  /** Base units actually received (settled rail's smallest unit). */
  receivedBaseUnits: bigint;
  /** Canonical USDC-equivalent micro-units (6dp) for crediting balances uniformly across rails. */
  creditMicros: bigint;
  /** Unique settlement id (on-chain signature / provider charge id), present when settled. */
  settlementId?: string;
  /** A second distinct settlement to the same order (double-pay) needs returning. */
  refundDue: boolean;
}

/**
 * A payment rail. Implementations must be exactly-once and verifiable: a returned `settled` MUST
 * mean the money provably arrived (see the 9 payment safety laws).
 */
export interface PaymentAdapter {
  readonly id: string; // "solana" | "stripe" | …
  /** Create a charge the payer/agent can fulfill. */
  charge(req: ChargeRequest): Promise<ChargeHandle>;
  /** Verify settlement for a previously created charge. Safe to call repeatedly (idempotent read). */
  verify(reference: string, valueUsd: number): Promise<VerifiedSettlement>;
}
