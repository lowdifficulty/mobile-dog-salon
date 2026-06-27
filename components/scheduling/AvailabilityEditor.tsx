"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BOOKING_BLOCK_STARTS,
  formatBookingBlockDisplay,
} from "@/lib/scheduling/groomers";
import {
  bookingBlockHours,
  isBookingBlockEnabled,
  listBookingBlockStarts,
  setBookingBlockEnabled,
} from "@/lib/scheduling/availability";
import { GROOMER_AVAILABILITY_BLOCK_MINUTES } from "@/lib/scheduling/services";
import type { AvailabilityDay, GroomerId } from "@/lib/scheduling/types";
import { getTodayPacificDate } from "@/lib/scheduling/slots";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getMonthGrid(year: number, month: number): (string | null)[] {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = [];

  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export default function AvailabilityEditor({
  apiBase,
  groomerId,
  readOnly = false,
}: {
  apiBase: string;
  groomerId?: GroomerId;
  readOnly?: boolean;
}) {
  const today = getTodayPacificDate();
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const [rows, setRows] = useState<Record<string, string[]>>({});
  const [lockedHours, setLockedHours] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [persistenceNote, setPersistenceNote] = useState("");

  const monthCells = useMemo(
    () => getMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    const res = await fetch(apiBase);
    if (!res.ok) {
      setMessage(
        res.status === 401
          ? "Session expired — please sign in again."
          : "Could not load availability."
      );
      setLoading(false);
      return;
    }
    const data = await res.json();
    const map: Record<string, string[]> = {};
    for (const a of data.availability as AvailabilityDay[]) {
      map[a.date] = [...a.times];
    }
    setRows(map);
    setLockedHours((data.locked as Record<string, string[]>) ?? {});
    if (data.persistence?.writable === false) {
      setPersistenceNote(data.persistence.message);
    } else {
      setPersistenceNote("");
    }
    setLoading(false);
  }, [apiBase]);

  useEffect(() => {
    load();
  }, [load]);

  function goMonth(delta: number) {
    const d = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
  }

  function selectDate(date: string) {
    setSelectedDate(date);
    setMessage("");
  }

  function isBlockLocked(date: string, blockStart: string): boolean {
    const dayLocked = new Set(lockedHours[date] ?? []);
    const block = bookingBlockHours(blockStart, GROOMER_AVAILABILITY_BLOCK_MINUTES);
    return block.some((hour) => dayLocked.has(hour));
  }

  function toggleBlock(date: string, blockStart: string) {
    if (readOnly) return;
    if (isBlockLocked(date, blockStart)) {
      setMessage("That block has a booked appointment and cannot be removed.");
      return;
    }
    setRows((prev) => {
      const current = prev[date] ?? [];
      const enabled = isBookingBlockEnabled(current, blockStart);
      const times = setBookingBlockEnabled(current, blockStart, !enabled);
      if (times.length === 0) {
        const next = { ...prev };
        delete next[date];
        return next;
      }
      return { ...prev, [date]: times };
    });
  }

  function markDayOff(date: string) {
    if (readOnly) return;
    if ((lockedHours[date]?.length ?? 0) > 0) {
      setMessage("This day has booked appointments — cancel or move them before marking the day off.");
      return;
    }
    setRows((prev) => {
      const next = { ...prev };
      delete next[date];
      return next;
    });
  }

  async function save() {
    if (readOnly || !groomerId) return;
    setSaving(true);
    setMessage("");
    const availability: AvailabilityDay[] = Object.entries(rows).map(([date, times]) => ({
      groomerId,
      date,
      times,
    }));

    const res = await fetch(apiBase, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability }),
    });

    setSaving(false);
    if (res.ok) {
      setMessage("Availability saved!");
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      const err =
        data.code === "PERSISTENCE_NOT_CONFIGURED"
          ? `${data.error} Ask admin to connect Upstash Redis on Vercel.`
          : data.error ?? "Could not save. Try again.";
      setMessage(err);
    }
  }

  const selectedTimes = selectedDate ? rows[selectedDate] : undefined;
  const selectedActive = Boolean(selectedTimes?.length);
  const selectedIsPast = selectedDate ? selectedDate < today : false;
  const canEditSelected = selectedDate && !readOnly && !selectedIsPast;

  if (loading) {
    return <p className="text-gray-500 text-sm">Loading availability…</p>;
  }

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] gap-8 items-start">
      <div>
        {!readOnly && (
          <div className="flex flex-wrap gap-3 mb-6">
            <button type="button" onClick={save} disabled={saving} className="site-btn text-sm">
              {saving ? "Saving…" : "Save availability"}
            </button>
          </div>
        )}
        {message && <p className="text-sm text-brand font-semibold mb-4">{message}</p>}
        {persistenceNote && (
          <p className="text-sm text-red-600 font-semibold mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {persistenceNote}
          </p>
        )}

        <div className="site-card p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              className="px-3 py-2 rounded-full border border-gray-200 text-sm font-semibold text-brand hover:border-accent"
              aria-label="Previous month"
            >
              ←
            </button>
            <h2 className="text-lg font-bold text-brand">{monthLabel(viewYear, viewMonth)}</h2>
            <button
              type="button"
              onClick={() => goMonth(1)}
              className="px-3 py-2 rounded-full border border-gray-200 text-sm font-semibold text-brand hover:border-accent"
              aria-label="Next month"
            >
              →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-xs font-bold text-gray-500 py-2 uppercase tracking-wide"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const isPast = date < today;
              const isToday = date === today;
              const isSelected = date === selectedDate;
              const hasHours = Boolean(rows[date]?.length) && !isPast;
              const weekday = new Date(`${date}T12:00:00`).getDay();
              const isWeekend = weekday === 0 || weekday === 6;

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => selectDate(date)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm font-semibold border transition-all ${
                    isSelected
                      ? "bg-brand text-white border-brand shadow-md scale-[1.02]"
                      : hasHours
                        ? "bg-accent/15 text-brand border-accent/40"
                        : isWeekend
                          ? "bg-gray-50 text-gray-400 border-gray-100"
                          : "bg-white text-gray-700 border-gray-100 hover:border-accent/40"
                  } ${isPast ? "opacity-50" : ""} ${isToday && !isSelected ? "ring-2 ring-accent ring-offset-1" : ""}`}
                >
                  <span>{Number(date.slice(8, 10))}</span>
                  {hasHours && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-gray-500 mt-4">
            {readOnly
              ? "Days with a dot have availability set. Click a day to view hours."
              : "Click a day to set your working hours. Blocks marked · booked cannot be removed until the appointment is cancelled or moved."}
          </p>
        </div>
      </div>

      <div className="site-card p-6 lg:sticky lg:top-8">
        {selectedDate ? (
          <>
            <h3 className="text-lg font-bold text-brand mb-1">{formatDateLabel(selectedDate)}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {selectedActive
                ? `${listBookingBlockStarts(selectedTimes!).length} three-hour block${
                    listBookingBlockStarts(selectedTimes!).length === 1 ? "" : "s"
                  } available`
                : "No hours set for this day"}
            </p>

            {selectedIsPast && (
              <p className="text-sm text-gray-500 mb-4">Past dates cannot be edited.</p>
            )}

            {canEditSelected && (
              <div className="flex flex-wrap gap-2 mb-4">
                {BOOKING_BLOCK_STARTS.map((blockStart) => {
                  const locked = isBlockLocked(selectedDate, blockStart);
                  const selected = isBookingBlockEnabled(selectedTimes ?? [], blockStart);
                  return (
                    <button
                      key={blockStart}
                      type="button"
                      onClick={() => toggleBlock(selectedDate, blockStart)}
                      disabled={locked}
                      title={locked ? "Booked appointment — cannot remove" : undefined}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        locked
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          : selected
                            ? "bg-brand text-white border-brand"
                            : "bg-white text-gray-600 border-gray-200 hover:border-accent"
                      }`}
                    >
                      {formatBookingBlockDisplay(blockStart)}
                      {locked ? " · booked" : ""}
                    </button>
                  );
                })}
              </div>
            )}

            {readOnly && selectedActive && (
              <div className="flex flex-wrap gap-2 mb-4">
                {listBookingBlockStarts(selectedTimes!).map((blockStart) => (
                  <span
                    key={blockStart}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-accent/15 text-brand border border-accent/30"
                  >
                    {formatBookingBlockDisplay(blockStart)}
                  </span>
                ))}
              </div>
            )}

            {canEditSelected && selectedActive && (
              <button
                type="button"
                onClick={() => markDayOff(selectedDate)}
                className="text-sm font-semibold text-gray-500 hover:text-red-600"
              >
                Mark this day off
              </button>
            )}

            {canEditSelected && !selectedActive && (
              <button
                type="button"
                onClick={() =>
                  setRows((prev) => ({
                    ...prev,
                    [selectedDate]: BOOKING_BLOCK_STARTS.reduce(
                      (times, start) => setBookingBlockEnabled(times, start, true),
                      [] as string[]
                    ),
                  }))
                }
                className="site-btn-outline text-sm w-full"
              >
                Open all 3-hour blocks (8 AM – 11 PM)
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">Select a day on the calendar to set hours.</p>
        )}
      </div>
    </div>
  );
}
