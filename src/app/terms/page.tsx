import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <main className="wrap">
      <article className="prose">
        <h1>Terms of Service</h1>
        <p><em>Last updated: {new Date().toISOString().slice(0, 10)}. This is a starting template — have a lawyer review it before relying on it.</em></p>

        <h2>1. The service</h2>
        <p>SolTip provides software for creating non-custodial cryptocurrency payment links and for
        metered, pay-per-call access to a catalog of tools (&ldquo;the Service&rdquo;). Payments settle
        directly between wallets on the Solana network. We never take custody of your funds or private
        keys.</p>

        <h2>2. Eligibility & accounts</h2>
        <p>You must be legally able to enter this agreement and use cryptocurrency where you live. You
        are responsible for your account credentials, API keys, and wallet security.</p>

        <h2>3. Payments, credits & fees</h2>
        <p>Prepaid credits are consumed per tool call at the prices shown at time of use. On-chain
        network fees are set by the network, not by us. Any platform fees are disclosed before you
        incur them. Cryptocurrency transactions are generally irreversible.</p>

        <h2>4. Acceptable use</h2>
        <p>Do not use the Service for unlawful activity, to launder funds, to evade sanctions, to
        infringe rights, or to abuse, overload, or attack the platform. We may suspend accounts that
        violate these terms.</p>

        <h2>5. No financial advice; assumption of risk</h2>
        <p>The Service is provided &ldquo;as is.&rdquo; Cryptocurrency carries risk, including total loss.
        Nothing here is financial, legal, or tax advice. You accept the risks of blockchain technology,
        including network failures, forks, and volatility.</p>

        <h2>6. Limitation of liability</h2>
        <p>To the maximum extent permitted by law, we are not liable for indirect, incidental, or
        consequential damages, or for losses arising from on-chain transactions, network conditions, or
        third-party wallets and services.</p>

        <h2>7. Changes</h2>
        <p>We may update these terms; continued use means acceptance. Material changes will be posted
        here with a new date.</p>

        <h2>8. Contact</h2>
        <p>Questions: <a href="/contact">contact us</a>.</p>
      </article>
    </main>
  );
}
