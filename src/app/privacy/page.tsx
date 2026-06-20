import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <main className="wrap">
      <article className="prose">
        <h1>Privacy Policy</h1>
        <p><em>Last updated: {new Date().toISOString().slice(0, 10)}. This is a starting template — have a lawyer review it before relying on it.</em></p>

        <h2>What we collect</h2>
        <ul>
          <li><strong>Account data:</strong> email and a hashed password (we never store plaintext passwords), your account name, and API keys.</li>
          <li><strong>Usage data:</strong> tool calls, credit balances, and invoice records needed to operate billing and settlement.</li>
          <li><strong>Contact messages:</strong> what you send us via the contact form.</li>
          <li><strong>On-chain data:</strong> public blockchain transactions are inherently public; we read them to verify payments. We do not collect your private keys.</li>
        </ul>

        <h2>How we use it</h2>
        <p>To provide the Service: authenticate you, meter and bill usage, verify settlement, prevent
        abuse, and respond to your messages. We do not sell your personal data.</p>

        <h2>Sharing</h2>
        <p>We share data only with infrastructure providers needed to run the Service (e.g. RPC and
        hosting) and where required by law. Blockchain data is public by design.</p>

        <h2>Security</h2>
        <p>Passwords are hashed (scrypt). Sessions use httpOnly cookies. API keys can be rotated at any
        time from your dashboard. No system is perfectly secure; protect your keys and credentials.</p>

        <h2>Retention</h2>
        <p>We keep account, billing, and ledger records for as long as your account is active and as
        required for legal and accounting purposes.</p>

        <h2>Your choices</h2>
        <p>You can rotate API keys, log out to end a session, or contact us to request deletion of your
        account data (on-chain records cannot be deleted).</p>

        <h2>Contact</h2>
        <p>Privacy questions: <a href="/contact">contact us</a>.</p>
      </article>
    </main>
  );
}
