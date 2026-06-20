import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SolTip — the commerce layer for the agent economy",
    template: "%s · SolTip",
  },
  description:
    "Premium business tools that AI agents can discover, use, and pay for — any payment rail, verifiable on-chain. Plus non-custodial Solana payment links. Free to start; pay to scale.",
  keywords: ["agent economy", "AI agents", "x402", "MCP", "Solana Pay", "USDC", "stablecoin payments", "agent commerce", "machine payments"],
  openGraph: {
    title: "SolTip — the commerce layer for the agent economy",
    description: "Tools AI agents can use and pay for — any rail, verifiable on-chain. Non-custodial payment links too.",
    url: siteUrl,
    siteName: "SolTip",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SolTip — the commerce layer for the agent economy",
    description: "Tools AI agents can use and pay for — any rail, verifiable on-chain.",
  },
};

import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
