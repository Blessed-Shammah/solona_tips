// Contact page — form (stored server-side, rate-limited) + direct contact details.
import Link from "next/link";
import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get in touch with the SolTip team — partnerships, support, press, or sales.",
};

export default function ContactPage() {
  return (
    <main className="wrap">
      <p className="tag">Questions, partnerships, press, or sales — we read every message.</p>

      <ContactForm />

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Other ways to reach us</h3>
        <div className="kv"><span>Email</span><span><a href="mailto:hello@soltip.io">hello@soltip.io</a></span></div>
        <div className="kv"><span>Sales / partnerships</span><span><a href="mailto:sales@soltip.io">sales@soltip.io</a></span></div>
        <div className="kv"><span>Developers</span><span><Link href="/developers">Developer console</Link></span></div>
        <div className="kv"><span>Docs</span><span><Link href="/blog">Blog &amp; guides</Link></span></div>
      </div>

      <p className="muted" style={{ marginTop: 16 }}>
        Update these addresses in <code>src/app/contact/page.tsx</code> once your domain email is live.
      </p>
    </main>
  );
}
