"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BOOKING_BLOCK_STARTS,
  SHIFT_HORIZON_MONTHS,
  formatBookingBlockDisplay,
  formatDisplayTime,
} from "@/lib/scheduling/groomers";
import {
  bookingBlockHours,
  isBookingBlockEnabled,
  listBookingBlockStarts,
  setBookingBlockEnabled,
} from "@/lib/scheduling/availability";
import { GROOMER_AVAILABILITY_BLOCK_MINUTES } from "@/lib/scheduling/services";
import type { AvailabilityDay, GroomerId } from "@/lib/scheduling/types";
import {
  getShiftHorizonEndDate,
  getTodayPacificDate,
} from "@/lib/scheduling/slots";

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

function shiftLabel(blockStart: string): string {
  return formatDisplayTime(blockStart);
}

function slotKey(date: string, time: string): string {
  return `${date}|${time}`;
}

export default function AvailabilityEditor({
  apiBase,
  groomerId,
  readOnly = false,
  includeGroomerIdInSave = false,
  addShiftRequest = null,
  shiftRequest = null,
  pendingSlotKeys = [],
  onPendingSlotChange,
  timeslotsAbove,
  onSaved,
}: {
  apiBase: string;
  groomerId?: GroomerId;
  readOnly?: boolean;
  /** When true, PUT body includes groomerId (staff/admin APIs). */
  includeGroomerIdInSave?: boolean;
  /** @deprecated Use shiftRequest */
  addShiftRequest?: { date: string; time: string; id: number } | null;
  /** Add or remove shift(s) from the available-timeslots list (before save). */
  shiftRequest?: {
    slots: { date: string; time: string }[];
    action: "add" | "remove";
    id: number;
  } | null;
  /** Keys for unsaved shifts queued from the timeslots list (`date|time`). */
  pendingSlotKeys?: string[];
  /** Keep pending timeslot keys in sync when toggling shifts on the calendar. */
  onPendingSlotChange?: (date: string, time: string, queued: boolean) => void;
  /** Open van timeslots panel — sits above the calendar in the left column. */
  timeslotsAbove?: ReactNode;
  onSaved?: () => void;
}) {
  const today = getTodayPacificDate();
  const maxDate = getShiftHorizonEndDate(SHIFT_HORIZON_MONTHS);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const [rows, setRows] = useState<Record<string, string[]>>({});
  const [lockedHours, setLockedHours] = useState<Record<string, string[]>>({});
  const [openSlotKeys, setOpenSlotKeys] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [persistenceNote, setPersistenceNote] = useState("");

  const monthCells = useMemo(
    () => getMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const canGoPrevMonth = useMemo(() => {
    const firstOfView = `${viewYear}-${String(viewMonth).padStart(2, "0")}-01`;
    const todayMonth = `${today.slice(0, 7)}-01`;
    return firstOfView > todayMonth;
  }, [viewYear, viewMonth, today]);

  const canGoNextMonth = useMemo(() => {
    const next = new Date(viewYear, viewMonth, 1); // first of following month
    const nextStart = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
    return nextStart <= maxDate;
  }, [viewYear, viewMonth, maxDate]);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    const res = await fetch(apiBase);
    if (!res.ok) {
      setMessage(
        res.status === 401
          ? "Session expired — please sign in again."
          : "Could not load shifts."
      );
      setLoading(false);
      return;
    }
    const data = await res.json();
    const map: Record<string, string[]> = {};
    for (const a of data.availability as AvailabilityDay[]) {
      if (a.date > maxDate) continue;
      map[a.date] = [...a.times];
    }
    setRows(map);
    setLockedHours((data.locked as Record<string, string[]>) ?? {});
    setOpenSlotKeys(new Set((data.openSlotKeys as string[]) ?? []));
    if (data.persistence?.writable === false) {
      setPersistenceNote(data.persistence.message);
    } else {
      setPersistenceNote("");
    }
    setLoading(false);
  }, [apiBase, maxDate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const request =
      shiftRequest ??
      (addShiftRequest
        ? {
            slots: [{ date: addShiftRequest.date, time: addShiftRequest.time }],
            action: "add" as const,
            id: addShiftRequest.id,
          }
        : null);
    if (!request || readOnly || request.slots.length === 0) return;

    const { slots, action } = request;
    const first = slots[0];

    for (const slot of slots) {
      if (slot.date < today || slot.date > maxDate) {
        setMessage("That timeslot is outside the shift window.");
        return;
      }
      if (!(BOOKING_BLOCK_STARTS as readonly string[]).includes(slot.time)) {
        setMessage("That timeslot is not a valid shift start.");
        return;
      }
    }

    if (action === "remove") {
      for (const slot of slots) {
        const dayLocked = new Set(lockedHours[slot.date] ?? []);
        const block = bookingBlockHours(slot.time, GROOMER_AVAILABILITY_BLOCK_MINUTES);
        if (block.some((hour) => dayLocked.has(hour))) {
          setMessage("That shift has a booked appointment and cannot be removed.");
          return;
        }
      }

      setViewYear(Number(first.date.slice(0, 4)));
      setViewMonth(Number(first.date.slice(5, 7)));
      setSelectedDate(first.date);

      setRows((prev) => {
        let next = prev;
        for (const slot of slots) {
          const current = next[slot.date] ?? [];
          if (!isBookingBlockEnabled(current, slot.time)) continue;
          const times = setBookingBlockEnabled(current, slot.time, false);
          if (times.length === 0) {
            next = { ...next };
            delete next[slot.date];
          } else {
            next = { ...next, [slot.date]: times };
          }
        }
        return next;
      });

      setMessage(
        slots.length === 1
          ? `Removed ${formatDisplayTime(first.time)} on ${formatDateLabel(first.date)} — not saved yet.`
          : `Removed ${slots.length} shifts on ${formatDateLabel(first.date)} — not saved yet.`
      );
      return;
    }

    for (const slot of slots) {
      if (!openSlotKeys.has(slotKey(slot.date, slot.time))) {
        setMessage("That timeslot is no longer available.");
        return;
      }
    }

    setViewYear(Number(first.date.slice(0, 4)));
    setViewMonth(Number(first.date.slice(5, 7)));
    setSelectedDate(first.date);

    setRows((prev) => {
      let next = prev;
      for (const slot of slots) {
        const current = next[slot.date] ?? [];
        if (isBookingBlockEnabled(current, slot.time)) continue;
        next = {
          ...next,
          [slot.date]: setBookingBlockEnabled(current, slot.time, true),
        };
      }
      return next;
    });

    setMessage(
      slots.length === 1
        ? `Added ${formatDisplayTime(first.time)} on ${formatDateLabel(first.date)} — click Save shifts to lock it in.`
        : `Added ${slots.length} shifts on ${formatDateLabel(first.date)} — click Save shifts to lock it in.`
    );
  }, [shiftRequest, addShiftRequest, readOnly, today, maxDate, openSlotKeys, lockedHours]);

  function isSlotOpen(date: string, blockStart: string): boolean {
    return openSlotKeys.has(slotKey(date, blockStart));
  }

  function visibleBlocksForDate(date: string, times: string[] | undefined): string[] {
    return BOOKING_BLOCK_STARTS.filter(
      (blockStart) =>
        isSlotOpen(date, blockStart) || isBookingBlockEnabled(times ?? [], blockStart)
    );
  }

  function openBlocksForDate(date: string): string[] {
    return BOOKING_BLOCK_STARTS.filter((blockStart) => isSlotOpen(date, blockStart));
  }

  function goMonth(delta: number) {
    if (delta < 0 && !canGoPrevMonth) return;
    if (delta > 0 && !canGoNextMonth) return;
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
    if (date < today || date > maxDate) return;
    if (isBlockLocked(date, blockStart)) {
      setMessage("That shift has a booked appointment and cannot be removed.");
      return;
    }
    setRows((prev) => {
      const current = prev[date] ?? [];
      const enabled = isBookingBlockEnabled(current, blockStart);
      if (!enabled && !isSlotOpen(date, blockStart)) {
        setMessage("That timeslot is no longer available.");
        return prev;
      }
      const times = setBookingBlockEnabled(current, blockStart, !enabled);
      if (enabled && pendingSlotKeys.includes(slotKey(date, blockStart))) {
        onPendingSlotChange?.(date, blockStart, false);
      }
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
      setMessage(
        "This day has booked appointments — cancel or move them before marking the day off."
      );
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
    const availability: AvailabilityDay[] = Object.entries(rows)
      .filter(([date]) => date >= today && date <= maxDate)
      .map(([date, times]) => ({
        groomerId,
        date,
        times,
      }));

    const res = await fetch(apiBase, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        includeGroomerIdInSave ? { groomerId, availability } : { availability }
      ),
    });

    setSaving(false);
    if (res.ok) {
      setMessage("Shifts saved!");
      await load();
      onSaved?.();
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
  const selectedVisibleBlocks = selectedDate
    ? visibleBlocksForDate(selectedDate, selectedTimes)
    : [];
  const selectedOpenBlocks = selectedDate ? openBlocksForDate(selectedDate) : [];
  const selectedIsPast = selectedDate ? selectedDate < today : false;
  const selectedBeyondHorizon = selectedDate ? selectedDate > maxDate : false;
  const canEditSelected =
    selectedDate && !readOnly && !selectedIsPast && !selectedBeyondHorizon;

  if (loading) {
    return <p className="text-gray-500 text-sm">Loading shifts…</p>;
  }

  return (
    <div>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button type="button" onClick={save} disabled={saving} className="site-btn text-sm">
            {saving ? "Saving…" : "Save shifts"}
          </button>
          <p className="text-sm text-gray-500">
            Select shifts up to {SHIFT_HORIZON_MONTHS} months ahead (through{" "}
            {new Date(`${maxDate}T12:00:00`).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            ). Any day of the week · 8 AM, 11 AM, 2 PM, 5 PM.
          </p>
        </div>
      )}
      {message && <p className="text-sm text-brand font-semibold mb-4">{message}</p>}
      {persistenceNote && (
        <p className="text-sm text-red-600 font-semibold mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {persistenceNote}
        </p>
      )}

      {timeslotsAbove && <div className="mb-4">{timeslotsAbove}</div>}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-start">
        <div className="site-card p-6 min-w-0">
          <div className="flex items-center justify-between gap-4 mb-6">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              disabled={!canGoPrevMonth}
              className="px-3 py-2 rounded-full border border-gray-200 text-sm font-semibold text-brand hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous month"
            >
              ←
            </button>
            <h2 className="text-lg font-bold text-brand">{monthLabel(viewYear, viewMonth)}</h2>
            <button
              type="button"
              onClick={() => goMonth(1)}
              disabled={!canGoNextMonth}
              className="px-3 py-2 rounded-full border border-gray-200 text-sm font-semibold text-brand hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed"
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
              const isBeyond = date > maxDate;
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
                  disabled={isBeyond}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm font-semibold border transition-all ${
                    isBeyond
                      ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                      : isSelected
                        ? "bg-brand text-white border-brand shadow-md scale-[1.02]"
                        : hasHours
                          ? "bg-accent/15 text-brand border-accent/40"
                          : isWeekend
                            ? "bg-gray-50 text-gray-400 border-gray-100"
                            : "bg-white text-gray-700 border-gray-100 hover:border-accent/40"
                  } ${isPast ? "opacity-50" : ""} ${isToday && !isSelected ? "ring-2 ring-accent ring-offset-1" : ""}`}
                >
                  <span>{Number(date.slice(8, 10))}</span>
                  {hasHours && !isSelected && !isBeyond && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-gray-500 mt-4">
            {readOnly
              ? "Days with a dot have shifts set. Click a day to view them."
              : "Click a day to pick open van shifts (8 AM, 11 AM, 2 PM, 5 PM). Booked or taken slots are hidden."}
          </p>
        </div>

        <div className="site-card p-6 lg:sticky lg:top-8">
        {selectedDate ? (
          <>
            <h3 className="text-lg font-bold text-brand mb-1">{formatDateLabel(selectedDate)}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {selectedActive
                ? `${listBookingBlockStarts(selectedTimes!).length} shift${
                    listBookingBlockStarts(selectedTimes!).length === 1 ? "" : "s"
                  } selected`
                : "No shifts set for this day"}
            </p>

            {selectedIsPast && (
              <p className="text-sm text-gray-500 mb-4">Past dates cannot be edited.</p>
            )}
            {selectedBeyondHorizon && (
              <p className="text-sm text-gray-500 mb-4">
                Shifts can only be set up to {SHIFT_HORIZON_MONTHS} months ahead.
              </p>
            )}

            {canEditSelected && selectedVisibleBlocks.length === 0 && (
              <p className="text-sm text-gray-500 mb-4">
                No open van timeslots on this day. All shifts are booked or already claimed.
              </p>
            )}

            {canEditSelected && selectedVisibleBlocks.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {selectedVisibleBlocks.map((blockStart) => {
                  const locked = isBlockLocked(selectedDate, blockStart);
                  const selected = isBookingBlockEnabled(selectedTimes ?? [], blockStart);
                  const open = isSlotOpen(selectedDate, blockStart);
                  return (
                    <button
                      key={blockStart}
                      type="button"
                      onClick={() => toggleBlock(selectedDate, blockStart)}
                      disabled={locked || (!selected && !open)}
                      title={
                        locked
                          ? "Booked appointment — cannot remove"
                          : !open && selected
                            ? "Your shift — click to remove"
                            : formatBookingBlockDisplay(blockStart)
                      }
                      className={`px-3 py-3 rounded-xl text-sm font-semibold border transition-colors ${
                        locked
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          : selected
                            ? "bg-brand text-white border-brand"
                            : "bg-white text-gray-700 border-gray-200 hover:border-accent"
                      }`}
                    >
                      <span className="block">{shiftLabel(blockStart)}</span>
                      <span
                        className={`block text-xs font-medium mt-0.5 ${
                          locked || !selected ? "text-gray-400" : "text-white/80"
                        }`}
                      >
                        {formatBookingBlockDisplay(blockStart)}
                        {locked ? " · booked" : ""}
                      </span>
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
                Clear all shifts this day
              </button>
            )}

            {canEditSelected && !selectedActive && selectedOpenBlocks.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setRows((prev) => ({
                    ...prev,
                    [selectedDate]: selectedOpenBlocks.reduce(
                      (times, start) => setBookingBlockEnabled(times, start, true),
                      [] as string[]
                    ),
                  }))
                }
                className="site-btn-outline text-sm w-full"
              >
                Select all open shifts this day
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">Select a day on the calendar to set shifts.</p>
        )}
        </div>
      </div>
    </div>
  );
}
