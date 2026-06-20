# UX-TRIGGER — how to get an LLM to build best-in-class UI/UX

For the **companion demo** (a Solana stablecoin checkout), not the skill repo itself. Build it in a
separate repo so the skill stays lean; have the demo *import the skill* as proof it works.

## The 3 levers (do all three — they compound)

1. **Load a design skill first**, don't free-prompt: `frontend-design` (aesthetic direction) and/or
   `vercel:shadcn` (component system). This shifts the model off its generic defaults.
2. **Run the screenshot→critique→iterate loop** with the Playwright MCP. The agent builds →
   screenshots itself → critiques vs the brief → fixes. ~4 passes is the difference between
   "templated" and "striking". One-shot UI is always mediocre.
3. **Give a sharp brief** (below), not "make it look good".

## The arranged prompt (paste, fill the [brackets])

> Build a checkout demo for a Solana stablecoin payment. **Before writing UI, load the
> `frontend-design` skill** and propose ONE distinctive visual direction (not a generic dashboard).
>
> **Product:** a hosted checkout page — merchant name, line item, amount in [USDC], a QR + wallet
> button (Solana Pay), and a live status that moves `pending → confirming → paid`. Use the
> `solana-payments` skill for all payment logic (server-authoritative amount, `reference`,
> verify-then-credit). Never let the client set the amount.
>
> **Feeling:** [trustworthy + fast, fintech-grade, calm — like Stripe Checkout but crypto-native].
> **Direction anchors:** [confident typographic hierarchy; one accent color; generous whitespace;
> real microcopy, no lorem; subtle motion on state changes; the QR is the hero].
> **Reference vibe:** [e.g. Stripe Checkout, Linear, Vercel] — match the *care*, not the pixels.
> **Constraints:** Next.js + Tailwind + shadcn/ui; light/dark; mobile-first; WCAG AA contrast;
> respects `prefers-reduced-motion`; loading/empty/error/success states all designed, not stubbed.
>
> **Then iterate with the loop:** run the page, screenshot it with Playwright at 390px and 1440px,
> critique your own screenshot against the brief (hierarchy, spacing, contrast, the payment-state
> moment), and fix the top 3 issues. Repeat until a skeptical designer would ship it. Show me a
> screenshot each pass.

## Brief-writing checklist (what makes the prompt sharp)

- **A direction, not adjectives.** "Confident typographic hierarchy, one accent, QR-as-hero" beats
  "modern and clean".
- **A named reference** for the *level of care* (Stripe/Linear/Vercel).
- **Every state designed:** loading, empty, error, underpaid, success — UX is the unhappy paths.
- **Real microcopy.** Lorem ipsum is the tell of a template.
- **The signature moment:** name the one interaction that must feel great (here: `pending → paid`).
- **Hard constraints:** stack, a11y (AA contrast, reduced-motion), responsive breakpoints.

## The loop is the secret

```
build → Playwright screenshot (390px + 1440px) → critique vs brief → fix top 3 → repeat ×~4
```

Tell the agent explicitly to screenshot and critique itself. Without the loop you get the model's
first guess; with it you get something that survives a designer's eye.

## Tools available in this environment

- `frontend-design` skill — visual direction / anti-template.
- `vercel:shadcn` skill — component system + theming.
- Playwright MCP — the screenshot/iterate loop (the quality multiplier).
- `figma:*` skills — if you want to design in Figma first, or push code → Figma.
