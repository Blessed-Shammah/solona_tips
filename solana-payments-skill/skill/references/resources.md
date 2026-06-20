# Resources — verified facts & sources

> Every fact here was verified against a live source on **2026-06-19**. Re-verify mints and SDK
> versions before a production launch — issuers add chains and rotate docs. **Always read decimals
> from the mint on-chain (`getMint`) rather than trusting this table for transfer math.**

## Stablecoin mints (Solana mainnet-beta)

| Token | Mint address | Decimals | Token program | Source |
|-------|--------------|:--------:|---------------|--------|
| **USDC** | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 6 | SPL Token (`Tokenkeg…`) | Circle; explorer.solana.com |
| **USDG** | `2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH` | 6 *(verify on-chain)* | SPL Token | solscan.io, solflare.com, globaldollar.com |
| **PYUSD** | `2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo` | 6 | **Token-2022** (`TokenzQd…`) | PayPal developer blog; solana.com |

- Program IDs: SPL Token = `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`,
  Token-2022 = `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`. Confirm the program that *owns* a mint
  with `getAccountInfo(mint).owner` before building transfer instructions.
- Associated Token Accounts derive differently per program — pass the correct program id to the ATA
  derivation. A USDC ATA and a PYUSD ATA are computed under different token programs.

## SDKs & specs

| Thing | What to use | Source |
|-------|-------------|--------|
| JS/TS SDK | `@solana/kit` (v5.x; functional, tree-shakeable successor to legacy `@solana/web3.js`; `createSolanaRpc`, `createSolanaRpcSubscriptions`) | github.com/anza-xyz/kit; npmjs.com/package/@solana/kit |
| SPL token instructions | `@solana-program/token` + `@solana-program/token-2022` | anza-xyz, npm |
| Payment request format | Solana Pay spec — `solana:<recipient>?amount&spl-token&reference&label&message&memo` | docs.solanapay.com/spec; github.com/solana-foundation/solana-pay |
| Reconciliation primitive | `reference` = base58 pubkey attached as read-only non-signer key; index via `getSignaturesForAddress(reference)` | Solana Pay SPEC.md; solana.com/docs/rpc/http/getsignaturesforaddress |
| ⚠️ `@solana/pay` helper caveat | `validateTransfer`/`findReference` has a documented edge case that could validate multiple transfers — verify the tx yourself | advisories.gitlab.com/pkg/npm/@solana/pay |
| Token-2022 extensions | check **transfer-fee** (received < sent) and **transfer-hook** (mandatory CPI per transfer) before trusting amount/compute | spl.solana.com / Token-2022 docs |
| Confirmation reality | `processed` droppable; ~5% of blocks land on abandoned forks; **Alpenglow** drives finality toward ~150 ms but commitment-by-value discipline still applies | solana.com/developers/guides/advanced/confirmation; helius.dev/blog/solana-commitment-levels |
| Webhooks / indexing | Helius webhooks (verify signing secret) + Enhanced Transactions API | helius.dev/docs |
| Multisig treasury | Squads protocol | docs.squads.so |
| Local testing | Surfpool (mainnet-fork) + LiteSVM/Mollusk; `solana-test-validator` for devnet-like | anza, surfpool docs |

## Verification commands (run before trusting a mint)

```bash
# Which token program owns the mint? (decides instruction set + ATA derivation)
solana account <MINT> --output json | jq '.account.owner'
# Decimals straight from the mint — never hardcode for transferChecked
spl-token display <MINT>
```

## Provider docs to consult at build time

- Solana Pay spec & reference impl — for request encoding, wallet behavior, partial-amount rules.
- Circle (USDC), Paxos/Global Dollar (USDG), PayPal (PYUSD) — for the canonical, current mint and
  any chain additions.
- Helius — webhook setup, signing-secret verification, Enhanced Transactions parsing.
- On/off-ramp providers — for KYC hand-off, settlement timing, supported corridors (see
  `onramp-offramp.md`).

> If a fact you need isn't here and you can't verify it live, **stop and flag it** — do not write a
> guessed address, version, or API signature into payments code.
