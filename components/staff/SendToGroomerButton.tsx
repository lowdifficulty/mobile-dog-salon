"use client";

import { useState } from "react";
import type { GroomerId } from "@/lib/scheduling/types";
import { GROOMERS } from "@/lib/scheduling/groomers";

export default function SendToGroomerButton({
  type,
  leadId,
  appointmentId,
  currentGroomerId,
  disabled,
  onSent,
}: {
  type: "lead" | "appointment";
  leadId?: string;
  appointmentId?: string;
  currentGroomerId?: GroomerId;
  disabled?: boolean;
  onSent?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const targets = (Object.keys(GROOMERS) as GroomerId[]).filter(
    (id) => id !== currentGroomerId
  );

  if (targets.length === 0) return null;

  async function send(toGroomerId: GroomerId) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/staff/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          leadId,
          appointmentId,
          toGroomerId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      setOpen(false);
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-brand bg-white text-brand hover:bg-brand/5 disabled:opacity-50"
      >
        Send to…
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-10 min-w-[10rem] rounded-xl border border-gray-200 bg-white shadow-lg py-1">
          {targets.map((id) => (
            <button
              key={id}
              type="button"
              disabled={busy}
              onClick={() => send(id)}
              className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-50"
            >
              {GROOMERS[id].name}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
