// Payment links — create a link, share it, get paid. (Moved from / so the homepage is the
// company landing.) Server component reads the rail list + cluster (no network).
import Link from "next/link";
import { listRails } from "@/lib/rails";
import { config } from "@/lib/config";
import CreateLinkForm from "@/components/CreateLinkForm";

export default function LinksPage() {
  const rails = listRails().map((r) => ({ id: r.id, label: r.label }));
  const merchantConfigured = !!process.env.MERCHANT_ADDRESS;

  return (
    <main className="wrap">
      <p className="tag">
        Create a payment link, share it, get paid. Funds land straight in your wallet.
        {" · "}<Link href="/developers">Developer console</Link>{" · "}<Link href="/pricing">Pricing</Link>
      </p>

      <div className="card">
        <span className={`pill ${config.cluster}`}>
          <span className="dot" /> {config.cluster.toUpperCase()}
        </span>

        {!merchantConfigured && (
          <div className="hint warnbox" style={{ marginTop: 16 }}>
            ⚠ <strong>MERCHANT_ADDRESS is not set.</strong> Copy <code>.env.example</code> →{" "}
            <code>.env.local</code> and set your wallet address before creating links.
          </div>
        )}

        <CreateLinkForm rails={rails} cluster={config.cluster} adminProtected={!!config.adminSecret} />
      </div>

      <p className="muted" style={{ marginTop: 18 }}>
        Non-custodial: this app never holds keys or funds. It only watches the chain to confirm a
        payment reached your wallet. Verification is server-side — a wallet saying “sent” is not
        “paid”.
      </p>
    </main>
  );
}
