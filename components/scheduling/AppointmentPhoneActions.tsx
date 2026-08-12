"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { formatPhoneDisplay, normalizePhone } from "@/lib/leads/normalize";

function phoneE164(phone: string): string | null {
  const digits = normalizePhone(phone);
  if (digits.length !== 10) return null;
  return `+1${digits}`;
}

export default function AppointmentPhoneActions({
  phone,
  className = "",
}: {
  phone: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const trimmed = phone.trim();
  const display = formatPhoneDisplay(trimmed);
  const e164 = phoneE164(trimmed);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const startCall = useCallback(() => {
    if (!e164) return;
    window.location.href = `tel:${e164}`;
    setOpen(false);
  }, [e164]);

  const startText = useCallback(() => {
    if (!e164) return;
    window.location.href = `sms:${e164}`;
    setOpen(false);
  }, [e164]);

  if (!trimmed) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!e164}
        className={`group w-full text-left rounded-md -mx-1 px-1 py-0.5 hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60 ${className}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="font-semibold text-gray-800">Phone: </span>
        <span className="text-brand font-medium underline-offset-2 group-hover:underline">
          {display}
        </span>
      </button>

      {open && e164 && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl border border-gray-200 p-4 space-y-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <p id={titleId} className="text-sm font-semibold text-gray-900">
                Contact client
              </p>
              <p className="mt-1 text-sm text-gray-600">{display}</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={startText}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                Text
              </button>
              <button
                type="button"
                onClick={startCall}
                className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Call
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
