"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BOOKING_BLOCK_STARTS,
  GROOMERS,
  formatBookingBlockDisplay,
} from "@/lib/scheduling/groomers";
import { listBookingBlockStarts } from "@/lib/scheduling/availability";
import type { AvailabilityDay, GroomerId } from "@/lib/scheduling/types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const GROOMER_IDS: GroomerId[] = ["melanie", "diamond"];

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

type RowsByGroomer = Record<GroomerId, Record<string, string[]>>;

function emptyRows(): RowsByGroomer {
  return { melanie: {}, diamond: {} };
}

export default function TeamAvailabilityCalendar() {
  const today = todayString();
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

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/availability");
    if (!res.ok) {
      setError("Could not load team availability. Try signing in again.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    const next = emptyRows();
    for (const a of data.availability as AvailabilityDay[]) {
      if (a.groomerId === "melanie" || a.groomerId === "diamond") {
        next[a.groomerId][a.date] = [...a.times];
      }
    }
    setRows(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
            {GROOMER_IDS.map((id) => (
              <span key={id} className="flex items-center gap-2 text-gray-700">
                <span
                  className={`w-3 h-3 rounded-full ${id === "melanie" ? "bg-brand" : "bg-accent"}`}
                />
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

            const melanieBlocks = listBookingBlockStarts(rows.melanie[date] ?? []);
            const diamondBlocks = listBookingBlockStarts(rows.diamond[date] ?? []);
            const melanieHours = melanieBlocks.length;
            const diamondHours = diamondBlocks.length;
            const hasAny = melanieHours > 0 || diamondHours > 0;
            const isSelected = date === selectedDate;
            const isToday = date === today;

            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 text-sm font-semibold border transition-all p-1 ${
                  isSelected
                    ? "bg-brand text-white border-brand shadow-md"
                    : hasAny
                      ? "bg-white text-gray-800 border-accent/30 hover:border-accent"
                      : "bg-gray-50 text-gray-500 border-gray-100 hover:border-gray-200"
                } ${isToday && !isSelected ? "ring-2 ring-accent ring-offset-1" : ""}`}
              >
                <span>{Number(date.slice(8, 10))}</span>
                <div className="flex gap-1">
                  {melanieHours > 0 && (
                    <span
                      className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : "bg-brand"}`}
                      title={`Melanie: ${melanieHours} block${melanieHours === 1 ? "" : "s"}`}
                    />
                  )}
                  {diamondHours > 0 && (
                    <span
                      className={`w-2 h-2 rounded-full ${isSelected ? "bg-accent-hot" : "bg-accent"}`}
                      title={`Diamond: ${diamondHours} block${diamondHours === 1 ? "" : "s"}`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Blue dot = Melanie · Pink dot = Diamond. Click a day for hour details.
        </p>
      </div>

      <div className="site-card p-6 lg:sticky lg:top-8 space-y-6">
        {selectedDate ? (
          <>
            <h3 className="text-lg font-bold text-brand">{formatDateLabel(selectedDate)}</h3>
            {GROOMER_IDS.map((id) => {
              const times = rows[id][selectedDate];
              const active = Boolean(times?.length);
              return (
                <div key={id}>
                  <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${id === "melanie" ? "bg-brand" : "bg-accent"}`}
                    />
                    {GROOMERS[id].name}
                  </h4>
                  {active ? (
                    <div className="flex flex-wrap gap-2">
                      {listBookingBlockStarts(times!).map((blockStart) => (
                        <span
                          key={blockStart}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                            id === "melanie"
                              ? "bg-brand/10 text-brand border-brand/30"
                              : "bg-accent/10 text-brand border-accent/30"
                          }`}
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
          <p className="font-semibold text-gray-700 mb-1">2-hour appointment blocks</p>
          <p>{BOOKING_BLOCK_STARTS.map((t) => formatBookingBlockDisplay(t)).join(" · ")}</p>
        </div>
      </div>
    </div>
  );
}
