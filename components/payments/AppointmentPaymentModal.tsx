"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAppointmentBookedPrice } from "@/lib/booking/appointment-title";
import { formatPrice } from "@/lib/pricing";
import type { Appointment } from "@/lib/scheduling/types";
import PaymentCardField, { type PaymentCardInstance } from "./PaymentCardField";

function formatWhen(startAt: string) {
  return new Date(startAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}

function formatMoney(dollars: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dollars);
}

export default function AppointmentPaymentModal({
  appointment,
  onClose,
  onPaid,
}: {
  appointment: Appointment;
  onClose: () => void;
  onPaid?: () => void;
}) {
  const serviceDollars = useMemo(() => getAppointmentBookedPrice(appointment), [appointment]);
  const defaultName = `${appointment.firstName} ${appointment.lastName}`.trim();

  const [cardholderName, setCardholderName] = useState(defaultName);
  const [postalCode, setPostalCode] = useState("");
  const [tip, setTip] = useState("");
  const [payCard, setPayCard] = useState<PaymentCardInstance | null>(null);
  const [paymentsConfigured, setPaymentsConfigured] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const tipDollars = useMemo(() => {
    const value = Number(tip);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }, [tip]);

  const totalDollars = serviceDollars != null ? serviceDollars + tipDollars : null;

  useEffect(() => {
    fetch("/api/payments/config")
      .then((r) => r.json())
      .then((c) => setPaymentsConfigured(Boolean(c.configured)))
      .catch(() => setPaymentsConfigured(false));
  }, []);

  const handlePayCardReady = useCallback((card: PaymentCardInstance | null) => {
    setPayCard(card);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (serviceDollars == null || totalDollars == null) {
      setError("Could not determine the appointment price.");
      return;
    }
    if (!payCard) {
      setError("Card form is not ready yet.");
      return;
    }
    if (!cardholderName.trim()) {
      setError("Enter the name on the card.");
      return;
    }
    if (!postalCode.trim() || !/^\d{5}(-\d{4})?$/.test(postalCode.trim())) {
      setError("Enter a valid billing ZIP code.");
      return;
    }

    setBusy(true);
    try {
      const tokenResult = await payCard.tokenize({
        cardholderName: cardholderName.trim(),
        postalCode: postalCode.trim(),
      });
      if (tokenResult.status !== "OK" || !tokenResult.token) {
        setError(tokenResult.errors?.[0]?.message ?? "Could not read card.");
        setBusy(false);
        return;
      }

      const res = await fetch("/api/staff/payments/appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment.id,
          sourceId: tokenResult.token,
          cardholderName: cardholderName.trim(),
          postalCode: postalCode.trim(),
          tipDollars: tipDollars,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Payment failed");
        setBusy(false);
        return;
      }

      setSuccess(
        `Paid ${formatMoney(data.payment.totalDollars ?? totalDollars)}. Card saved for ${appointment.phone}.`
      );
      onPaid?.();
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  if (appointment.status === "cancelled") {
    return (
      <PaymentModalShell appointment={appointment} onClose={onClose}>
        <p className="text-sm text-red-600">This appointment was cancelled.</p>
      </PaymentModalShell>
    );
  }

  if (serviceDollars == null) {
    return (
      <PaymentModalShell appointment={appointment} onClose={onClose}>
        <p className="text-sm text-amber-800">
          No quoted price for this appointment. Update pet size/service before collecting payment.
        </p>
      </PaymentModalShell>
    );
  }

  return (
    <PaymentModalShell appointment={appointment} onClose={onClose}>
      {!paymentsConfigured ? (
        <p className="text-sm text-amber-800">
          Online payments are not configured yet. Add Square or Stripe credentials first.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between gap-3">
              <span className="text-gray-600">Service</span>
              <span className="font-semibold text-gray-900">{formatPrice(serviceDollars)}</span>
            </div>
            <div className="flex justify-between gap-3 items-center">
              <label htmlFor="appt-tip" className="text-gray-600">
                Tip
              </label>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">$</span>
                <input
                  id="appt-tip"
                  type="number"
                  min="0"
                  max="10000"
                  step="0.01"
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  placeholder="0.00"
                  className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-right text-sm"
                />
              </div>
            </div>
            <div className="flex justify-between gap-3 border-t border-gray-200 pt-2 mt-2">
              <span className="font-semibold text-brand">Total</span>
              <span className="font-bold text-brand">{formatMoney(totalDollars ?? 0)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Name on card
            </label>
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              autoComplete="cc-name"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl"
              required
            />
          </div>

          <div>
            <p className="block text-sm font-medium text-gray-700 mb-1.5">
              Card number · Expiration · CVV
            </p>
            <p className="text-xs text-gray-500 mb-2">
              Enter card details in the secure form below (PCI-compliant — numbers never touch our
              servers).
            </p>
            <PaymentCardField onReady={handlePayCardReady} disabled={busy} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Billing ZIP code
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              autoComplete="postal-code"
              placeholder="92660"
              className="w-full max-w-[10rem] px-4 py-3 border border-gray-200 rounded-xl"
              required
            />
          </div>

          <p className="text-xs text-gray-500">
            Card will be saved to {appointment.phone} for future visits.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-700 font-semibold">{success}</p>}

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="submit"
              disabled={busy || !paymentsConfigured || Boolean(success)}
              className="site-btn flex-1 min-w-[140px]"
            >
              {busy ? "Processing…" : `Pay ${formatMoney(totalDollars ?? 0)}`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              {success ? "Close" : "Cancel"}
            </button>
          </div>
        </form>
      )}
    </PaymentModalShell>
  );
}

function PaymentModalShell({
  appointment,
  onClose,
  children,
}: {
  appointment: Appointment;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="appt-pay-title"
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="appt-pay-title" className="text-lg font-bold text-brand">
              Collect payment
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              {appointment.firstName} {appointment.lastName} · {formatWhen(appointment.startAt)}
            </p>
            <p className="text-xs text-gray-500">{appointment.phone}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none px-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
