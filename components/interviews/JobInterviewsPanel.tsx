"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPhoneDisplay } from "@/lib/leads/normalize";

interface InterviewBookingRow {
  id: string;
  slotKey: string;
  date: string;
  time: string;
  fullName: string;
  email: string;
  phone: string;
  roleTitle: string;
  payDescription: string;
  bookedAt: string;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}

function formatInterviewDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  });
}

export default function JobInterviewsPanel() {
  const [bookings, setBookings] = useState<InterviewBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadBookings = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetch("/api/admin/interview-bookings")
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then((d) => setBookings(d.bookings ?? []))
      .catch(() => setError("Could not load interview bookings."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  async function deleteBooking(id: string) {
    if (!window.confirm("Cancel this interview booking and free the time slot?")) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/interview-bookings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setExpandedId(null);
      await loadBookings();
    } catch {
      setError("Could not delete booking.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading job interviews…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-600">
            {bookings.length} interview booking{bookings.length === 1 ? "" : "s"} · sorted by time
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Groomer interviews · Tuesday Jul 14, 2026 · 9:00 AM–12:00 PM Pacific
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadBookings()}
          className="text-sm font-semibold text-brand hover:text-accent"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {bookings.length === 0 ? (
        <p className="text-sm text-gray-600 rounded-xl bg-gray-50 border border-gray-200 px-4 py-6">
          No interview bookings yet. Share the{" "}
          <a href="/careers/interview" className="font-semibold text-brand hover:text-accent">
            interview scheduling page
          </a>{" "}
          with candidates.
        </p>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const expanded = expandedId === booking.id;
            const busy = busyId === booking.id;

            return (
              <article
                key={booking.id}
                className="rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : booking.id)}
                  className="w-full text-left px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">{booking.fullName}</p>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-900 bg-emerald-200 px-2 py-0.5 rounded-full">
                        {booking.roleTitle}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5 font-medium">
                      {formatInterviewDate(booking.date)} · {booking.time} Pacific
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {booking.email} · {formatPhoneDisplay(booking.phone)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Booked {formatWhen(booking.bookedAt)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-800 bg-white/80 border border-emerald-200 px-2 py-1 rounded-full shrink-0">
                    {booking.payDescription}
                  </span>
                </button>

                {expanded && (
                  <div className="border-t border-emerald-200/80 px-4 py-4 space-y-3 bg-white/60">
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Email
                        </p>
                        <a href={`mailto:${booking.email}`} className="text-brand hover:underline">
                          {booking.email}
                        </a>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Phone
                        </p>
                        <a href={`tel:${booking.phone}`} className="text-brand hover:underline">
                          {formatPhoneDisplay(booking.phone)}
                        </a>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => deleteBooking(booking.id)}
                        className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Cancel booking
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
