"use client";

import { useState } from "react";

export default function AppointmentMessageButton({
  appointmentId,
  onOpenConversation,
  disabled,
  className = "font-semibold text-brand hover:text-accent disabled:opacity-50",
  variant = "link",
}: {
  appointmentId: string;
  onOpenConversation: (contactId: string) => void;
  disabled?: boolean;
  className?: string;
  variant?: "link" | "pill";
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/crm/contacts/from-appointment?appointmentId=${encodeURIComponent(appointmentId)}`
      );
      const data = (await res.json()) as { contactId?: string; error?: string };
      if (!res.ok || !data.contactId) {
        throw new Error(data.error ?? "Could not open messages");
      }
      onOpenConversation(data.contactId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not open messages");
    } finally {
      setBusy(false);
    }
  }

  const pillClass =
    "mt-2 inline-flex items-center rounded-full border border-brand px-4 py-2 text-xs font-semibold text-brand hover:bg-brand/5 disabled:opacity-50";

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={disabled || busy}
      className={variant === "pill" ? pillClass : className}
    >
      {busy ? "Opening…" : "Message"}
    </button>
  );
}
