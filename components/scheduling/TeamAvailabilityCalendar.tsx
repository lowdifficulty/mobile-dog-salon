"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BOOKABLE_GROOMER_IDS,
  BOOKING_BLOCK_STARTS,
  GROOMERS,
  formatBookingBlockDisplay,
} from "@/lib/scheduling/groomers";
import { listBookingBlockStarts } from "@/lib/scheduling/availability";
import type { AvailabilityDay, GroomerId } from "@/lib/scheduling/types";
import { getTodayPacificDate } from "@/lib/scheduling/slots";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function groomerDotClass(id: GroomerId, selected: boolean): string {
  if (id === "melanie") return selected ? "bg-white" : "bg-brand";
  return selected ? "bg-accent-hot" : "bg-accent";
}

function groomerChipClass(id: GroomerId): string {
  if (id === "melanie") return "bg-brand/10 text-brand border-brand/30";
  return "bg-accent/10 text-brand border-accent/30";
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatDateLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
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

type RowsByGroomer = Partial<Record<GroomerId, Record<string, string[]>>>;

function emptyRows(): RowsByGroomer {
  return Object.fromEntries(BOOKABLE_GROOMER_IDS.map((id) => [id, {}]));
}

export default function TeamAvailabilityCalendar({
  availabilityApi = "/api/admin/availability",
  refreshKey = 0,
  scopeGroomerId,
}: {
  availabilityApi?: string;
  refreshKey?: number;
  /** When set, only this groomer's shifts are shown (groomer dashboard). */
  scopeGroomerId?: GroomerId;
}) {
  const visibleGroomerIds = useMemo(
    () =>
      scopeGroomerId
        ? ([scopeGroomerId] as GroomerId[])
        : BOOKABLE_GROOMER_IDS,
    [scopeGroomerId]
  );
  const today = getTodayPacificDate();
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const [rows, setRows] = useState<RowsByGroomer>(emptyRows);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const monthCells = useMemo(
    () => getMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const legendText = useMemo(
    () =>
      visibleGroomerIds.map((id) => {
        const color = id === "melanie" ? "Blue" : "Pink";
        return `${color} dot = ${GROOMERS[id].name}`;
      }).join(" · "),
    [visibleGroomerIds]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(availabilityApi);
    if (!res.ok) {
      setError("Could not load team availability. Try signing in again.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    const next = emptyRows();
    for (const a of data.availability as AvailabilityDay[]) {
      if (!visibleGroomerIds.includes(a.groomerId)) continue;
      const bucket = next[a.groomerId] ?? {};
      bucket[a.date] = [...a.times];
      next[a.groomerId] = bucket;
    }
    setRows(next);
    setLoading(false);
  }, [availabilityApi, visibleGroomerIds]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  function goMonth(delta: number) {
    const d = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
  }

  if (loading) {
    return <p className="text-gray-500 text-sm">Loading team calendar…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-8 items-start">
      <div className="site-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap gap-4 text-sm font-semibold">
            {visibleGroomerIds.map((id) => (
              <span key={id} className="flex items-center gap-2 text-gray-700">
                <span className={`w-3 h-3 rounded-full ${groomerDotClass(id, false)}`} />
                {GROOMERS[id].name}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="text-sm font-semibold text-brand hover:underline"
          >
            Refresh
          </button>
        </div>

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
            const blockCounts = visibleGroomerIds.map((id) => ({
              id,
              blocks: isPast ? [] : listBookingBlockStarts(rows[id]?.[date] ?? [], id),
            }));
            const hasAny = blockCounts.some((g) => g.blocks.length > 0);
            const isSelected = date === selectedDate;
            const isToday = date === today;

            return (
              <button
                key={date}
                type="button"
                onClick={() => !isPast && setSelectedDate(date)}
                disabled={isPast}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 text-sm font-semibold border transition-all p-1 ${
                  isPast
                    ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                    : isSelected
                      ? "bg-brand text-white border-brand shadow-md"
                      : hasAny
                        ? "bg-white text-gray-800 border-accent/30 hover:border-accent"
                        : "bg-gray-50 text-gray-500 border-gray-100 hover:border-gray-200"
                } ${isToday && !isSelected && !isPast ? "ring-2 ring-accent ring-offset-1" : ""}`}
              >
                <span>{Number(date.slice(8, 10))}</span>
                <div className="flex gap-1">
                  {blockCounts.map(({ id, blocks }) =>
                    blocks.length > 0 ? (
                      <span
                        key={id}
                        className={`w-2 h-2 rounded-full ${groomerDotClass(id, isSelected)}`}
                        title={`${GROOMERS[id].name}: ${blocks.length} block${blocks.length === 1 ? "" : "s"}`}
                      />
                    ) : null
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {legendText ? (
          <p className="text-xs text-gray-500 mt-4">{legendText}. Click a day for hour details.</p>
        ) : (
          <p className="text-xs text-gray-500 mt-4">No groomers are accepting bookings.</p>
        )}
      </div>

      <div className="site-card p-6 lg:sticky lg:top-8 space-y-6">
        {selectedDate && selectedDate >= today ? (
          <>
            <h3 className="text-lg font-bold text-brand">{formatDateLabel(selectedDate)}</h3>
            {visibleGroomerIds.map((id) => {
              const times = rows[id]?.[selectedDate];
              const active = Boolean(times?.length);
              return (
                <div key={id}>
                  <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${groomerDotClass(id, false)}`} />
                    {GROOMERS[id].name}
                  </h4>
                  {active ? (
                    <div className="flex flex-wrap gap-2">
                      {listBookingBlockStarts(times!, id).map((blockStart) => (
                        <span
                          key={blockStart}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${groomerChipClass(id)}`}
                        >
                          {formatBookingBlockDisplay(blockStart)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hours set</p>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <p className="text-sm text-gray-500">Select a day on the calendar.</p>
        )}

        <div className="border-t border-gray-100 pt-4 text-xs text-gray-500">
          <p className="font-semibold text-gray-700 mb-1">Availability blocks (3-hour)</p>
          <p>{BOOKING_BLOCK_STARTS.map((t) => formatBookingBlockDisplay(t)).join(" · ")}</p>
        </div>
      </div>
    </div>
  );
}
