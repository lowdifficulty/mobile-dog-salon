"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AvailableVanTimeslot,
  VanConflict,
} from "@/lib/scheduling/van-capacity";

type VanSummary = {
  vanCount: number;
  availableTimeslots: AvailableVanTimeslot[];
  availableCount: number;
  conflicts: VanConflict[];
  conflictCount: number;
};

function slotKey(date: string, time: string): string {
  return `${date}|${time}`;
}

export default function VanCapacityOverview({
  apiBase = "/api/staff/van-capacity",
  onAddTimeslot,
  pendingSlotKeys = [],
}: {
  apiBase?: string;
  /** Add an open van timeslot to the shift calendar below (save to lock in). */
  onAddTimeslot?: (date: string, time: string) => void;
  /** Slots already queued in the editor but not saved yet. */
  pendingSlotKeys?: string[];
}) {
  const [summary, setSummary] = useState<VanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showAllAvailable, setShowAllAvailable] = useState(false);

  const pending = new Set(pendingSlotKeys);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    const res = await fetch(apiBase);
    if (!res.ok) {
      setMessage(
        res.status === 401
          ? "Session expired — please sign in again."
          : "Could not load van capacity."
      );
      setLoading(false);
      return;
    }
    const data = await res.json();
    setSummary({
      vanCount: data.vanCount,
      availableTimeslots: data.availableTimeslots ?? [],
      availableCount: data.availableCount ?? 0,
      conflicts: data.conflicts ?? [],
      conflictCount: data.conflictCount ?? 0,
    });
    setLoading(false);
  }, [apiBase]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-gray-500 mb-6">Loading van capacity…</p>;
  }

  if (!summary) {
    return (
      <p className="text-sm text-red-600 mb-6">{message || "Could not load van capacity."}</p>
    );
  }

  const visibleSlots = showAllAvailable
    ? summary.availableTimeslots
    : summary.availableTimeslots.slice(0, 16);

  return (
    <div className="mb-8 space-y-4">
      {message && <p className="text-sm font-semibold text-brand">{message}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="site-card p-5">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h4 className="text-base font-bold text-brand">Available timeslots</h4>
            <span className="text-xs font-semibold text-gray-500">
              {summary.availableCount} open (next 30 days)
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Open van slots (1 van). Use + to add a shift to the calendar below, then Save.
          </p>
          {visibleSlots.length === 0 ? (
            <p className="text-sm text-gray-500">No open van timeslots in the next 30 days.</p>
          ) : (
            <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {visibleSlots.map((slot) => {
                const key = slotKey(slot.date, slot.time);
                const queued = pending.has(key);
                return (
                  <li
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className="font-semibold text-brand">{slot.displayDate}</span>
                      <span className="text-gray-600">{slot.displayTime}</span>
                    </div>
                    {onAddTimeslot && (
                      <button
                        type="button"
                        onClick={() => onAddTimeslot(slot.date, slot.time)}
                        disabled={queued}
                        title={
                          queued
                            ? "Added to calendar below — Save shifts to lock in"
                            : "Add this shift to the calendar below"
                        }
                        aria-label={
                          queued
                            ? `Shift queued for ${slot.displayDate} ${slot.displayTime}`
                            : `Add ${slot.displayDate} ${slot.displayTime} to calendar`
                        }
                        className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full border text-lg font-bold leading-none transition-colors ${
                          queued
                            ? "border-brand bg-brand text-white cursor-default"
                            : "border-gray-200 bg-white text-brand hover:border-brand hover:bg-brand hover:text-white"
                        }`}
                      >
                        {queued ? "✓" : "+"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {summary.availableTimeslots.length > 16 && (
            <button
              type="button"
              onClick={() => setShowAllAvailable((v) => !v)}
              className="mt-3 text-sm font-semibold text-brand hover:underline"
            >
              {showAllAvailable
                ? "Show fewer"
                : `Show all ${summary.availableCount} open slots`}
            </button>
          )}
        </section>

        <section className="site-card p-5">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h4 className="text-base font-bold text-brand">Current conflicts</h4>
            <span
              className={`text-xs font-semibold ${
                summary.conflictCount > 0 ? "text-red-600" : "text-gray-500"
              }`}
            >
              {summary.conflictCount} conflict{summary.conflictCount === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Overlapping appointments that can’t both run with one van.
          </p>
          {summary.conflicts.length === 0 ? (
            <p className="text-sm text-gray-500">
              No overlapping appointments — the van schedule is clear.
            </p>
          ) : (
            <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {summary.conflicts.map((conflict) => (
                <li
                  key={conflict.id}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-3"
                >
                  <p className="text-sm font-bold text-red-800">
                    {new Date(`${conflict.date}T12:00:00`).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {conflict.displayWindow}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {conflict.appointments.map((ap) => (
                      <li key={ap.id} className="text-sm text-red-900">
                        <span className="font-semibold">{ap.groomerName}</span>
                        {" — "}
                        {ap.displayTime}
                        {" · "}
                        {ap.petName || "Pet"} ({ap.clientName || "Client"})
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
