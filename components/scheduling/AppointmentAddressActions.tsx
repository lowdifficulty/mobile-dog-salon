"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { googleMapsSearchUrl } from "@/lib/scheduling/address";

export default function AppointmentAddressActions({
  address,
  className = "",
}: {
  address: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const trimmed = address.trim();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const copyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(trimmed);
      setCopied(true);
      window.setTimeout(() => setOpen(false), 700);
    } catch {
      window.prompt("Copy address:", trimmed);
      setOpen(false);
    }
  }, [trimmed]);

  const openMaps = useCallback(() => {
    window.open(googleMapsSearchUrl(trimmed), "_blank", "noopener,noreferrer");
    setOpen(false);
  }, [trimmed]);

  if (!trimmed) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group w-full text-left rounded-md -mx-1 px-1 py-0.5 hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${className}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="font-semibold text-gray-700">Address: </span>
        <span className="text-brand font-medium underline-offset-2 group-hover:underline break-words">
          {trimmed}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" aria-hidden />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl border border-gray-200 p-4 space-y-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <p id={titleId} className="text-sm font-semibold text-gray-900">
                Address
              </p>
              <p className="mt-1 text-sm text-gray-600 break-words">{trimmed}</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={copyAddress}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                type="button"
                onClick={openMaps}
                className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Open in Google Maps
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
