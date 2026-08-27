"use client";

import { useState } from "react";
import type { GroomerId } from "@/lib/scheduling/types";
import { GROOMERS, groomerAcceptsBookings } from "@/lib/scheduling/groomers";

const DEFAULT_LINK_CLASS =
  "font-semibold text-gray-600 hover:text-brand disabled:opacity-50";

export default function SendToGroomerButton({
  type,
  leadId,
  appointmentId,
  currentGroomerId,
  disabled,
  onSent,
  className = DEFAULT_LINK_CLASS,
}: {
  type: "lead" | "appointment";
  leadId?: string;
  appointmentId?: string;
  currentGroomerId?: GroomerId;
  disabled?: boolean;
  onSent?: () => void;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const targets = (Object.keys(GROOMERS) as GroomerId[]).filter(
    (id) => id !== currentGroomerId && groomerAcceptsBookings(id)
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
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {targets.map((id) => (
        <button
          key={id}
          type="button"
          disabled={disabled || busy}
          onClick={() => send(id)}
          className={className}
        >
          Send to {GROOMERS[id].name}
        </button>
      ))}
      {error && <span className="text-red-600">{error}</span>}
    </>
  );
}
