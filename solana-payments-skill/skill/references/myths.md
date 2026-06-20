# myths.md — 5 payment myths that cause real losses

The fastest way to write a correct Solana payment system is to unlearn five assumptions. Each below
is a belief that *feels* true, the reality, and where in this skill it's handled. Sources are in
`resources.md`.

## Myth 1 — "The wallet said 'sent', so I've been paid."

**Reality:** a wallet "sent" only means a transaction was *submitted*. During congestion,
transactions are dropped and never land; an RPC node can even report a failed tx as successful. You
are paid only when **you** find the transaction on-chain at your chosen commitment and verify amount
+ mint + recipient + reference. → `confirmation.md` (Safety Law #4).

## Myth 2 — "Solana is fast, so a payment is final instantly."

**Reality:** speed ≠ finality discipline. `processed` is droppable, and historically ~5% of blocks
don't get finalized (they belong to abandoned forks). The 2026 Alpenglow upgrade pushes finality
toward ~150 ms — wonderful, but you *still* choose a commitment by value and `finalized` before
anything irreversible (refunds, off-ramp). Fast finality lowers the wait; it doesn't let you skip
the check. → `confirmation.md`.

## Myth 3 — "The amount I requested is the amount I received."

**Reality:** with **Token-2022 transfer fees**, the recipient gets *less* than was sent — the fee is
withheld on transfer. If you compare against the gross requested amount you'll mark legitimate
payments "underpaid". Always derive the credited amount from the on-chain **balance delta** and set
your expected value net-of-fee. → `rails.md` (Token-2022 extensions) + `confirmation.md`.

## Myth 4 — "Webhooks are reliable enough to credit a payment."

**Reality:** webhooks get missed, delayed, replayed, and forged. Treat them as a *hint to go look at
the chain*, never as the source of truth. Back every webhook with a poller over the invoice
`reference`, verify the tx yourself, and credit under a DB unique constraint so replays can't
double-credit. Note: the `@solana/pay` `validateTransfer`/`findReference` helper has a documented
multi-transfer edge case — your own verification is the authority. → `reconciliation.md` (Safety
Laws #5, #6).

## Myth 5 — "All stablecoins are just SPL tokens; pick any and transfer."

**Reality:** USDC and USDG use the **classic SPL Token** program; **PYUSD uses Token-2022** with a
different program id, different ATA derivation, and possible **transfer-fee / transfer-hook**
extensions. Hardcoding one program (or hardcoding decimals instead of `transferChecked`) silently
breaks the other rail or misroutes funds. Resolve the token program from the mint owner and verify
the mint, not the symbol. → `rails.md` (Safety Laws #2, #3).

---

`★ The through-line:` every myth is a form of *trusting a claim instead of verifying chain state*.
The skill's whole posture — verify the mint, verify the amount that landed, verify at a value-
appropriate commitment, reconcile against the chain — is the antidote.
