"use client";
// The "Living Receipt Tape" — driven by requestAnimationFrame so it scrolls reliably (CSS
// animations get disabled by prefers-reduced-motion / some browsers; this does not).
import { useEffect, useRef } from "react";

const TAPE = [
  { id: "0x9A…41", tool: "TikTok Fintech Scale Audit", amt: "69.0000" },
  { id: "0x2F…8B", tool: "Shopify Payout UGC Revamp", amt: "49.0000" },
  { id: "0x1C…99", tool: "Salesforce RevOps Cleanup", amt: "59.0000" },
  { id: "0x7E…2A", tool: "Creator Adaptation Radar", amt: "39.0000" },
  { id: "0x3D…11", tool: "Fintech Growth Audit", amt: "29.0000" },
  { id: "0x5B…74", tool: "Formula Ops Builder", amt: "19.0000" },
];

export default function ReceiptTape() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let y = 0;
    let raf = 0;
    let last = performance.now();
    const speed = 35; // px per second

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      y += speed * dt;
      const half = el.scrollHeight / 2; // content is duplicated, so reset at the halfway point
      if (half > 0 && y >= half) y -= half;
      el.style.transform = `translateY(${-y}px)`;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="tape-wrap bg-grid">
      <div className="tape-fade top" />
      <div className="tape" ref={ref}>
        {[...TAPE, ...TAPE].map((tx, i) => (
          <div className="tape-card" key={i}>
            <div className="tape-head"><span className="id">AGENT_ID: {tx.id}</span><span className="dot" /></div>
            <div className="tape-tool">{tx.tool}</div>
            <div className="tape-foot"><span className="lbl">Paid</span><span className="amt">◎ {tx.amt}</span></div>
          </div>
        ))}
      </div>
      <div className="tape-fade bot" />
    </div>
  );
}
