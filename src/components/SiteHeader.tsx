"use client";
// Global navigation — on every page via the root layout. Logo links home; mobile hamburger menu.
import Link from "next/link";
import { useState } from "react";

const LINKS: [string, string][] = [
  ["/developers", "Developers"],
  ["/profile", "Profile"],
  ["/docs", "Docs"],
  ["/pricing", "Pricing"],
  ["/blog", "Blog"],
  ["/contact", "Contact"],
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="logo" aria-label="SolTip home" onClick={() => setOpen(false)}>
          SolTip<span className="dot">.</span>
        </Link>
        <div className="nav-links desktop">
          {LINKS.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          <Link href="/developers" className="nav-cta">Start building</Link>
        </div>
        <button className="nav-burger" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? "✕" : "☰"}
        </button>
      </div>
      {open && (
        <div className="nav-mobile">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>
          ))}
          <Link href="/developers" className="nav-cta" onClick={() => setOpen(false)}>Start building</Link>
        </div>
      )}
    </nav>
  );
}
