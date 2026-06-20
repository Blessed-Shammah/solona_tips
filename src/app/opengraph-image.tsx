// Social share image (PNG), generated at request time by next/og. Shown when a SolTip link is
// posted to X, Slack, Discord, iMessage, etc. Next auto-wires it as the og:image + twitter:image.
import { ImageResponse } from "next/og";

export const alt = "SolTip — the commerce layer for the agent economy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0a0b0f",
          backgroundImage:
            "radial-gradient(900px 500px at 85% -10%, rgba(153,69,255,0.35), transparent 60%), radial-gradient(800px 460px at -5% 110%, rgba(20,241,149,0.25), transparent 55%)",
          color: "#e7e9ee",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 36 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #14F195, #9945FF)",
              display: "flex",
            }}
          />
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>SolTip</div>
        </div>

        <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 980, display: "flex", flexWrap: "wrap" }}>
          The commerce layer for the agent economy
        </div>

        <div style={{ fontSize: 30, color: "#9aa0ad", marginTop: 28, maxWidth: 900 }}>
          Premium tools AI agents can use and pay for — any rail, verifiable on-chain. Free to start; pay to scale.
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 44 }}>
          {["Agent-payable", "MCP-native", "Non-custodial", "x402"].map((t) => (
            <div
              key={t}
              style={{
                fontSize: 24,
                color: "#14F195",
                border: "1px solid #262a36",
                borderRadius: 999,
                padding: "8px 20px",
                display: "flex",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
