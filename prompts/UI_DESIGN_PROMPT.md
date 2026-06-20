# UI/UX Design Prompt — SolTip

A reusable, professional prompt for redesigning the SolTip interface with a senior design-engineer's
judgment. Paste section **A** into Claude (or any capable model) to drive a focused redesign — in
Figma, in code, or both. Fill the `<…>` knobs first.

---

## A. The prompt (copy-paste this)

```
ROLE
You are a senior product designer + design engineer (think Linear, Vercel, Stripe design quality).
You design interfaces that feel intentional, fast, and trustworthy — never templated. You think in
design tokens, type scales, and components, and you can express the result as both a Figma structure
and production CSS/React. You make decisions and explain the reasoning; you don't hand back a menu.

PRODUCT
SolTip — "the commerce layer for the agent economy." A platform where AI agents (and people)
discover, use, and pay for premium tools, plus non-custodial Solana payment links. Audience:
developers, AI-agent builders, and crypto-native businesses. Tone: technical, credible, premium,
calm-confident — it handles money, so it must feel precise and trustworthy, not playful or hypey.

STACK (must stay compatible)
Next.js App Router + plain CSS with CSS variables (see src/app/globals.css). No UI framework. Dark
theme. Brand accents: Solana green #14F195 and purple #9945FF on near-black #0a0b0f. Keep it
framework-free and token-driven so it ports cleanly to code.

DESIGN DIRECTION — vibe: <minimal-technical | premium-fintech | bold-modern>
Make the UI more FOCUSED: stronger hierarchy, fewer competing elements per view, generous whitespace,
one clear primary action per screen. Reduce visual noise; increase confidence.

DELIVER, IN THIS ORDER
1. DESIGN TOKENS — a complete set: color (semantic: bg/surface/border/text/muted/brand/success/
   danger, plus state hovers), spacing scale (8pt grid), radii, shadows/elevation, z-index. Give
   exact values, as CSS custom properties AND as a Figma variables table.
2. TYPOGRAPHY SYSTEM — pick a font pairing (a display/sans for headings + a clean sans for body, and
   a mono for code/addresses/amounts). Recommend specific Google/Vercel-hosted fonts and WHY. Define
   a modular type scale (e.g. 1.25 ratio): sizes, weights, line-heights, and letter-spacing for
   h1–h4, body, small, label, mono. Show the scale as a table.
3. COMPONENT SPECS — for each core component: anatomy, variants, states (default/hover/active/
   focus/disabled/loading), sizing, and token usage. Cover: Button (primary/secondary/ghost),
   Input/Select/Textarea, Card, Pill/Badge, Nav, Pricing card, Status indicator, Code block,
   QR/payment card, Table/key-value rows, Toast/empty state. Note focus-visible + 44px touch targets.
4. PAGE-BY-PAGE REDESIGN — concrete improvements for each, with layout, hierarchy, and the single
   primary action: Landing (hero, how-it-works, who-it's-for, FAQ, CTA), Developer console
   (API key, balance, top-up, run-a-tool, usage), Pricing (Free/Pro/Scale), Blog index + post
   (reading experience, max line length ~70ch), Contact, Payment-link creator, and the public Pay
   page (the highest-trust moment — make "Paid" unmistakable).
5. MOTION — subtle, purposeful: durations, easing, and where to use them (button press, status
   change, page-in). Nothing that slows the user down. Respect prefers-reduced-motion.
6. FIGMA STRUCTURE — how to organize the file: pages (Foundations, Components, Screens), a variables
   collection mapping 1:1 to the CSS tokens, component sets with variants, and auto-layout settings
   so it mirrors the responsive code.

CONSTRAINTS
- Accessibility: WCAG AA contrast (≥4.5:1 body, ≥3:1 large/UI), visible focus rings, semantic order,
  reduced-motion support. State the contrast ratios for your color choices.
- Responsive: define breakpoints and how the grid/nav/cards reflow (mobile-first).
- Trust cues for money UI: clear amounts (mono, tabular figures), explicit network/cluster badges,
  unambiguous success/pending/failed states. Never let "sent" look like "paid".
- Don't introduce a heavy UI library; keep it tokens + small components.
- Every choice maps to a token. No magic numbers in component specs.

OUTPUT FORMAT
Lead with the design rationale in 3–4 sentences (the through-line). Then the 6 deliverables above,
each concrete and implementation-ready. Where you show values, show them as a copy-pasteable
:root { } CSS block AND a matching token table. End with a prioritized list of the 5 highest-impact
changes to ship first.

CURRENT FOCUS
<e.g. "Redesign the landing + pay page first" or "Just give me the type system + tokens">
```

---

## B. How to use it

1. **Pick the knobs**: the `vibe` (start with `premium-fintech` — it fits money + agents) and the
   `CURRENT FOCUS` (don't ask for all 6 pages at once; start with tokens + type + the landing).
2. **Run it** in Claude. For Figma output, follow with: *"Now create this in Figma"* (the Figma MCP
   tools will build the variables, components, and screens). For code, follow with: *"Now apply the
   tokens + type system to `src/app/globals.css` and the landing components."*
3. **Iterate one layer at a time** — tokens → type → components → pages. Don't redesign everything in
   one shot; lock the foundations first so every page inherits them.

## C. Font-pairing shortcuts (if you want to skip the research step)

Replace the TYPOGRAPHY step's "pick a pairing" with one of these proven, free combos:

| Vibe | Headings | Body | Mono |
|------|----------|------|------|
| premium-fintech | **Geist** or **Inter** (tight tracking) | Inter | **Geist Mono** / JetBrains Mono |
| minimal-technical | **Inter Display** | Inter | IBM Plex Mono |
| bold-modern | **Satoshi** / **General Sans** | Inter | Space Mono |

For a money/agent product, **Geist + Geist Mono** (Vercel's fonts) is the safe, premium default —
crisp, technical, and free. Use the mono for amounts, wallet addresses, API keys, and code.

## D. Why this prompt beats "make the UI nicer"

| Weak ask | This prompt |
|----------|-------------|
| "make it look better" | Sets a senior design-engineer persona + Linear/Stripe quality bar |
| no system | Forces tokens → type → components → pages (foundations first) |
| generic | Encodes the real brand, stack, audience, and trust requirements |
| code or Figma, not both | Outputs CSS variables AND a Figma variable/component structure |
| ignores a11y | Requires WCAG AA, focus states, reduced-motion, touch targets |
| vague output | Demands implementation-ready specs + a prioritized ship list |
```
