# Gemini Design Prompt — SolTip (original, reinvented UI)

Paste section A into Gemini. It's written to force an **original** visual identity — not a clone of
Payoneer/Stripe/Linear or the generic SaaS template. Ask for high-fidelity mockup images of the
screens, then share them back for implementation.

---

## A. The prompt (copy-paste)

```
You are an award-winning product designer with a distinctive point of view (think Awwwards
"Site of the Day", not a SaaS template). Design an ORIGINAL visual identity and high-fidelity UI
for a product called SolTip. Output high-resolution mockup images of the screens listed below,
plus a short design rationale and the exact color + type tokens you used.

THE PRODUCT
SolTip — "payments built for the agent economy." A platform where AI agents (and people) can
discover, use, and pay for premium software tools per call, plus simple non-custodial crypto
payment links. It runs on Solana but feels like modern fintech, not "crypto." Audience: developers,
AI-agent builders, and global businesses. Personality: precise, confident, a little futuristic —
it moves real money, so it must feel trustworthy AND original.

NON-NEGOTIABLE: REINVENT, DON'T COPY
- Do NOT reproduce the standard SaaS landing (centered headline + gradient blob + a row of 3 icon
  cards + logo strip). I've seen it a thousand times.
- Do NOT imitate Payoneer, Stripe, Linear, Vercel, or any site you can name. Invent something that
  could only be SolTip.
- Surprise me with the layout: consider an asymmetric / editorial / grid-broken composition, an
  unexpected hero, a signature visual motif, or an interactive-feeling concept. Bold but usable.

ART DIRECTION
- LIGHT theme only. No dark mode. Crisp white / near-white canvas.
- Sharp, vivid, confident color — saturated accents with real contrast, not pastel mush.
- Media-rich: use illustration, 3D/abstract shapes, motion-implied graphics, product UI snippets,
  or photography — your call, but make it feel alive, not flat.
- Invent a SIGNATURE MOTIF that represents "an agent paying for a tool / money moving with proof"
  (e.g. a recurring shape, a flow line, a token, a node graph) and carry it across the design.
- Brand seed colors to reinterpret (don't use literally if you find something stronger):
  Solana green #14F195 and purple #9945FF. Push them somewhere fresh.

TYPOGRAPHY
- Choose an expressive but legible type system: a characterful display face for headlines paired
  with a clean grotesque/sans for body, and a mono for amounts, wallet addresses, and code.
- Name the exact fonts and give a type scale (sizes/weights/tracking). Headlines can be big and
  opinionated.

SCREENS TO DESIGN (high-fidelity mockups)
1. Landing / home — hero with the signature motif, what it is, "how it's used" (two paths:
   get paid vs. build+monetize tools), social proof, pricing teaser, strong CTA. Make the hero
   unforgettable.
2. Developer console — API key, credit balance, "run a tool" panel with live output, usage list.
   This is where the product's magic shows; make it feel powerful and clear.
3. Pricing — Free / Pro / Scale, with the value ladder obvious at a glance.
4. The "agent pays for a tool" moment — a focused visual that explains x402 in one screen.

COMPONENTS TO DEFINE
Buttons (primary/secondary/ghost), inputs, cards, pills/badges, a payment/QR card, a status
indicator (pending/paid/failed — money states must be unmistakable), a code block, and nav.

CONSTRAINTS
- Accessibility: WCAG AA contrast; state the ratios for your key color pairs.
- Responsive: show or describe the mobile hero + nav.
- Money-trust cues: amounts in tabular mono, clear network badge, success that can't be mistaken
  for "pending."
- Keep it implementable in plain CSS/React (no exotic dependencies).

DELIVERABLES
1. The mockup images for the 4 screens.
2. A 4-sentence rationale: the big idea + the signature motif.
3. Tokens: a :root CSS block (colors, spacing, radii, shadows) + the type scale table.
4. The 5 details that make this design feel original (so they survive into code).
```

---

## B. Tips to get a stronger result from Gemini

- If Gemini outputs images, follow up with: *"Now give me the exact CSS tokens and font names from
  that mockup so it can be built 1:1."*
- Push originality if the first try is generic: *"This still looks like a default SaaS page —
  reinvent the hero and the layout grid; show me three radically different directions."*
- Ask for variants: *"Give me 3 distinct art directions: (1) editorial/typographic, (2)
  3D/dimensional, (3) data-viz/technical — same content, different soul."*
- When you share the result back here, send the images + the tokens/fonts and I'll implement it
  faithfully in the codebase.

## C. What I'll need from you to build it

- The mockup image(s).
- Font names (or links) + the color/spacing tokens.
- Any motion notes. I'll translate it into the Next.js + CSS-token system we already have.
```
