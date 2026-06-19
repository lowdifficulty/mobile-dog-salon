"use client";

import { useEffect, useState } from "react";
import type { AvailableSlot } from "@/lib/scheduling/types";
import { getWeekStart } from "@/lib/scheduling/slots";

interface WeekDay {
  date: string;
  weekday: string;
  dayNumber: number;
  monthShort: string;
  isPast: boolean;
  slots: AvailableSlot[];
}

interface WeekAvailabilityPickerProps {
  service: string;
  selectedDate: string;
  selectedSlotKey: string;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slot: AvailableSlot) => void;
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export default function WeekAvailabilityPicker({
  service,
  selectedDate,
  selectedSlotKey,
  onSelectDate,
  onSelectSlot,
}: WeekAvailabilityPickerProps) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [days, setDays] = useState<WeekDay[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!service) {
      setDays([]);
      return;
    }
    setLoading(true);
    fetch(
      `/api/availability?week=${weekStart}&service=${encodeURIComponent(service)}`
    )
      .then((r) => r.json())
      .then((d) => setDays(d.days ?? []))
      .catch(() => setDays([]))
      .finally(() => setLoading(false));
  }, [service, weekStart]);

  const selectedDay = days.find((d) => d.date === selectedDate);
  const availableDays = days.filter((d) => !d.isPast && d.slots.length > 0);

  function shiftWeek(offset: number) {
    const d = new Date(`${weekStart}T12:00:00`);
    d.setDate(d.getDate() + offset * 7);
    const next = getWeekStart(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
    setWeekStart(next);
    onSelectDate("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => shiftWeek(-1)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-brand-bright/50"
          aria-label="Previous week"
        >
          ←
        </button>
        <p className="text-sm font-semibold text-gray-900 text-center">
          {formatWeekRange(weekStart)}
        </p>
        <button
          type="button"
          onClick={() => shiftWeek(1)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-brand-bright/50"
          aria-label="Next week"
        >
          →
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading availability…</p>
      ) : availableDays.length === 0 ? (
        <p className="text-sm text-gray-600 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
          No open appointments this week. Try the next week — groomers post availability
          in their calendars.
        </p>
      ) : (
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {days.map((day) => {
            const hasSlots = !day.isPast && day.slots.length > 0;
            const isSelected = selectedDate === day.date;
            return (
              <button
                key={day.date}
                type="button"
                disabled={!hasSlots}
                onClick={() => hasSlots && onSelectDate(day.date)}
                className={`flex flex-col items-center rounded-xl border px-1 py-2 sm:px-2 sm:py-3 transition-all ${
                  !hasSlots
                    ? "border-transparent text-gray-300 cursor-not-allowed"
                    : isSelected
                      ? "border-brand bg-brand text-white shadow-sm"
                      : "border-gray-200 text-gray-800 hover:border-brand-bright/50 bg-white"
                }`}
              >
                <span className="text-[10px] sm:text-xs font-medium uppercase">
                  {day.weekday}
                </span>
                <span className="text-base sm:text-lg font-bold leading-tight">
                  {day.dayNumber}
                </span>
                <span className="text-[10px] sm:text-xs hidden sm:block">
                  {day.monthShort}
                </span>
                {hasSlots && (
                  <span
                    className={`mt-1 text-[10px] font-semibold ${
                      isSelected ? "text-white/90" : "text-brand-bright"
                    }`}
                  >
                    {day.slots.length} open
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedDay && selectedDay.slots.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Available times (2-hour appointments)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {selectedDay.slots.map((slot) => (
              <button
                key={slot.slotKey}
                type="button"
                onClick={() => onSelectSlot(slot)}
                className={`px-3 py-3 rounded-xl border text-sm font-semibold text-left transition-all ${
                  selectedSlotKey === slot.slotKey
                    ? "border-brand bg-brand text-white"
                    : "border-gray-200 hover:border-accent text-gray-800"
                }`}
              >
                <span className="block">{slot.displayTime}</span>
                <span
                  className={`block text-xs mt-0.5 ${
                    selectedSlotKey === slot.slotKey ? "text-white/90" : "text-gray-500"
                  }`}
                >
                  with {slot.groomerName}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
