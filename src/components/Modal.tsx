"use client";
import { useEffect } from "react";

export default function Modal({
  open,
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm?: () => void;
  onCancel: () => void;
}) {
  // Close on Escape; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          <button className="secondary" style={{ marginTop: 0, width: "auto", padding: "10px 18px" }} onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          {onConfirm && (
            <button
              style={{ marginTop: 0, width: "auto", padding: "10px 18px", ...(danger ? { boxShadow: "3px 3px 0 0 #E6004C" } : {}) }}
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? "…" : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
