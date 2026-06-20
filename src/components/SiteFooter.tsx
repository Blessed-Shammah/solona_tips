// Global footer — rendered on every page via the root layout.
import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="foot">
      <div className="foot-inner">
        <span className="muted">© {new Date().getFullYear()} SolTip · the agent-economy commerce layer</span>
        <div className="nav-links">
          <Link href="/developers">Developers</Link>
          <Link href="/products">Products</Link>
          <Link href="/profile">Profile</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
