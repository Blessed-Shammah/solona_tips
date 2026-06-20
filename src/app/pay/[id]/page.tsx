// Public pay page. Server component: loads the invoice, rebuilds the Solana Pay URL deterministically
// (the same server-authoritative inputs — never client-supplied), renders a QR + wallet deep link,
// and mounts the live status poller.
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getInvoice } from "@/lib/db";
import { buildSolanaPayUrl } from "@/lib/payments-core.mjs";
import PayStatus from "@/components/PayStatus";

export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = getInvoice(id);
  if (!invoice) notFound();

  const solanaPayUrl = buildSolanaPayUrl({
    recipient: invoice.merchant_address,
    amountDecimal: invoice.amount_decimal,
    mint: invoice.is_native ? undefined : invoice.mint,
    reference: invoice.reference,
    label: invoice.label,
    message: invoice.message || `Payment ${invoice.id.slice(0, 8)}`,
  });

  const qrDataUrl = await QRCode.toDataURL(solanaPayUrl, { margin: 1, width: 232 });
  const terminal = invoice.status !== "pending";

  return (
    <main className="wrap">
      <div className="brand">
        <div className="brand-dot" />
        <h1>{invoice.label}</h1>
      </div>
      <p className="tag">{invoice.message || "Payment request"}</p>

      <div className="card center">
        <div className="amount">
          {invoice.amount_decimal}
          <small>{invoice.rail_id}</small>
        </div>

        <div className="qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="Solana Pay QR code" />
        </div>

        <div>
          <a href={solanaPayUrl}>
            <button type="button" style={{ maxWidth: 320, margin: "0 auto" }}>Open in wallet</button>
          </a>
        </div>

        <p className="muted" style={{ marginTop: 16 }}>
          Scan with any Solana Pay wallet (Phantom, Solflare…) or tap “Open in wallet” on mobile.
        </p>

        <div style={{ marginTop: 18 }}>
          <PayStatus id={invoice.id} initialStatus={invoice.status} initialTerminal={terminal} />
        </div>
      </div>

      <p className="muted center" style={{ marginTop: 18 }}>
        Payment is confirmed on-chain by the recipient’s server. Don’t close this page until it shows
        <strong> Paid</strong>.
      </p>
    </main>
  );
}
