"use client";
import { useEffect, useState } from "react";

type Status = "pending" | "paid" | "expired" | "underpaid";

const LABELS: Record<Status, string> = {
  pending: "Waiting for payment…",
  paid: "Paid — thank you!",
  expired: "Expired — request a new link",
  underpaid: "Underpaid — contact the recipient",
};

export default function PayStatus({
  id,
  initialStatus,
  initialTerminal,
}: {
  id: string;
  initialStatus: Status;
  initialTerminal: boolean;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [done, setDone] = useState(initialTerminal);

  useEffect(() => {
    if (done) return;
    let active = true;

    async function poll() {
      try {
        const res = await fetch(`/api/invoice/${id}/status`, { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        if (data.status) setStatus(data.status as Status);
        if (data.status && data.status !== "pending") setDone(true);
      } catch {
        /* transient — keep polling */
      }
    }

    poll();
    const t = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [id, done]);

  return (
    <span className={`status ${status}`} role="status" aria-live="polite">
      <span className="dot" />
      {LABELS[status]}
    </span>
  );
}
