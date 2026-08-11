"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GroomerAccountingSummary } from "@/lib/analytics/groomer-accounting";
import type { GroomerId } from "@/lib/scheduling/types";

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

function monthInputValue(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "2026";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

export default function GroomerAccountingPanel({ groomerId }: { groomerId: GroomerId }) {
  const [month, setMonth] = useState(() => monthInputValue());
  const [summary, setSummary] = useState<GroomerAccountingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/groomer/accounting?month=${encodeURIComponent(month)}`);
    if (!res.ok) {
      setError("Could not load accounting.");
      setLoading(false);
      return;
    }
    setSummary(await res.json());
    setLoading(false);
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const groomerLabel = useMemo(() => {
    if (groomerId === "jessica") return "Your share (60%)";
    if (groomerId === "melanie") return "Your share";
    return "Your share";
  }, [groomerId]);

  const salonLabel = useMemo(() => {
    if (groomerId === "jessica") return "Mobile Dog Salon (40%)";
    if (groomerId === "melanie") return "Mobile Dog Salon ($30/dog)";
    return "Mobile Dog Salon";
  }, [groomerId]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand">Accounting</h2>
          <p className="text-sm text-gray-600 mt-1">
            Credit card and cash grooms · non-cancelled appointments count as completed
          </p>
          {summary?.commissionLabel && (
            <p className="text-sm font-medium text-gray-700 mt-2">{summary.commissionLabel}</p>
          )}
        </div>
        <div>
          <label htmlFor="groomer-accounting-month" className="block text-xs font-semibold text-gray-500 mb-1">
            Month
          </label>
          <input
            id="groomer-accounting-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading accounting…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {summary && !loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="site-card p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Credit card</p>
              <p className="text-2xl font-bold text-brand mt-1">{summary.cardTotalDisplay}</p>
              <p className="text-sm text-gray-500 mt-1">
                {summary.cardPaymentCount} groom{summary.cardPaymentCount === 1 ? "" : "s"}
              </p>
            </div>
            <div className="site-card p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Cash</p>
              <p className="text-2xl font-bold text-brand mt-1">{summary.cashTotalDisplay}</p>
              <p className="text-sm text-gray-500 mt-1">
                {summary.cashPaymentCount} groom{summary.cashPaymentCount === 1 ? "" : "s"} (no card on file)
              </p>
            </div>
            <div className="site-card p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{groomerLabel}</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{summary.groomerTotalDisplay}</p>
              <p className="text-sm text-gray-500 mt-1">{summary.periodLabel}</p>
            </div>
            <div className="site-card p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{salonLabel}</p>
              <p className="text-2xl font-bold text-brand mt-1">{summary.salonTotalDisplay}</p>
              <p className="text-sm text-gray-500 mt-1">
                Gross {summary.grossTotalDisplay} · {summary.appointmentCount} grooms
              </p>
            </div>
          </div>

          <div className="site-card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-brand">{summary.periodLabel} grooms</h3>
            </div>
            {summary.rows.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No completed grooms this month.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">When</th>
                      <th className="px-4 py-3 font-semibold">Client</th>
                      <th className="px-4 py-3 font-semibold">Dogs</th>
                      <th className="px-4 py-3 font-semibold">Groom $</th>
                      <th className="px-4 py-3 font-semibold">Payment</th>
                      <th className="px-4 py-3 font-semibold">Your share</th>
                      <th className="px-4 py-3 font-semibold">Salon share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {summary.rows.map((row) => (
                      <tr key={row.appointmentId} className="text-gray-800">
                        <td className="px-4 py-3 whitespace-nowrap">{formatWhen(row.startAt)}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{row.clientName}</div>
                          <div className="text-xs text-gray-500">{row.petSummary}</div>
                        </td>
                        <td className="px-4 py-3">{row.dogCount}</td>
                        <td className="px-4 py-3 font-semibold">{row.serviceDisplay}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              row.paymentMethod === "card"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            {row.paymentMethod === "card" ? "Card" : "Cash"}
                          </span>
                          {row.cardAmountDisplay && row.paymentMethod === "card" && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              Charged {row.cardAmountDisplay}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">
                          {row.groomerShareDisplay}
                        </td>
                        <td className="px-4 py-3">{row.salonShareDisplay}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
