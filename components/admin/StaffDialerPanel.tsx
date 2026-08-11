"use client";

import { useEffect, useState } from "react";

export default function StaffDialerPanel() {
  const [toPhone, setToPhone] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("mds-crm-staff-phone");
      if (saved) setStaffPhone(saved);
    } catch {
      /* ignore */
    }
  }, []);

  async function dial() {
    const to = toPhone.trim();
    const staff = staffPhone.trim();
    if (!to) {
      setError("Enter the number to call");
      return;
    }
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      if (staff) sessionStorage.setItem("mds-crm-staff-phone", staff);
      const res = await fetch("/api/admin/twilio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dial",
          to,
          staffPhone: staff || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Call failed");
      setMessage("Calling your phone first — answer to connect to the customer.");
      setToPhone("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Call failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-brand">Dialer</h3>
        <p className="text-xs text-gray-600 mt-1">
          Call any number from the business line. Your cell rings first; when you answer,
          Twilio connects the customer.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 text-green-800 px-3 py-2 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Number to call
        </span>
        <input
          value={toPhone}
          onChange={(e) => setToPhone(e.target.value)}
          placeholder="9493863351 or +19493863351"
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Your cell (click-to-call)
        </span>
        <input
          value={staffPhone}
          onChange={(e) => setStaffPhone(e.target.value)}
          placeholder="Your phone — not the business line"
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </label>

      <button
        type="button"
        onClick={() => void dial()}
        disabled={busy || !toPhone.trim()}
        className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-white disabled:opacity-50"
      >
        {busy ? "Dialing…" : "Call number"}
      </button>
    </div>
  );
}
