"use client";

import { useEffect, useMemo, useState } from "react";
import type { AvailableSlot } from "@/lib/scheduling/types";
import { formatDateISO } from "@/lib/scheduling/slots";
import {
  buildFallbackRangeDays,
  type FallbackWeekDay,
} from "@/lib/scheduling/fallback-availability";

const DAYS_TO_FETCH = 60;
const VISIBLE_DAY_COUNT = 5;

interface WeekDay extends FallbackWeekDay {}

interface WeekAvailabilityPickerProps {
  service: string;
  selectedDate: string;
  selectedSlotKey: string;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slot: AvailableSlot) => void;
}

function formatDayRange(days: WeekDay[]): string {
  if (days.length === 0) return "";
  const first = new Date(`${days[0].date}T12:00:00`);
  const last = new Date(`${days[days.length - 1].date}T12:00:00`);
  const firstLabel = first.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const lastLabel = last.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: first.getFullYear() === last.getFullYear() ? undefined : "numeric",
  });
  if (days.length === 1) return firstLabel;
  return `${firstLabel} – ${lastLabel}`;
}

async function fetchAvailabilityRange(
  fromDate: string,
  service: string
): Promise<WeekDay[]> {
  const res = await fetch(
    `/api/availability?from=${fromDate}&days=${DAYS_TO_FETCH}&service=${encodeURIComponent(service)}`
  );
  if (!res.ok) {
    throw new Error("Availability request failed");
  }
  const data = await res.json();
  return data.days ?? [];
}

export default function WeekAvailabilityPicker({
  service,
  selectedDate: _selectedDate,
  selectedSlotKey,
  onSelectDate,
  onSelectSlot,
}: WeekAvailabilityPickerProps) {
  const [days, setDays] = useState<WeekDay[]>([]);
  const [pageStart, setPageStart] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);

  useEffect(() => {
    if (!service) {
      setDays([]);
      setPageStart(0);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setFallbackMode(false);
      setPageStart(0);

      const fromDate = formatDateISO(new Date());

      try {
        const result = await fetchAvailabilityRange(fromDate, service);
        if (cancelled) return;
        setDays(result);
      } catch {
        if (cancelled) return;
        setDays(buildFallbackRangeDays(fromDate, DAYS_TO_FETCH));
        setFallbackMode(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [service]);

  const availableDays = useMemo(
    () => days.filter((day) => !day.isPast && day.slots.length > 0),
    [days]
  );

  const visibleDays = availableDays.slice(pageStart, pageStart + VISIBLE_DAY_COUNT);
  const canGoPrev = pageStart > 0;
  const canGoNext = pageStart + VISIBLE_DAY_COUNT < availableDays.length;

  function shiftPage(offset: number) {
    if (offset < 0 && !canGoPrev) return;
    if (offset > 0 && !canGoNext) return;
    setPageStart((prev) => Math.max(0, prev + offset * VISIBLE_DAY_COUNT));
  }

  function handleSelectSlot(slot: AvailableSlot) {
    onSelectDate(slot.date);
    onSelectSlot(slot);
  }

  return (
    <div className="space-y-3">
      {fallbackMode && (
        <p className="text-xs text-amber-800 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          We couldn&apos;t load live availability. All time slots are shown as open — your
          groomer will confirm your appointment.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading availability…</p>
      ) : availableDays.length === 0 ? (
        <p className="text-sm text-gray-600 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
          No open appointments in the next {DAYS_TO_FETCH} days. Check back soon — groomers
          post availability in their calendars.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shiftPage(-1)}
              disabled={!canGoPrev}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:border-brand-bright/50 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              aria-label="Earlier days"
            >
              ← Earlier
            </button>
            <p className="text-xs font-semibold text-gray-700 text-center">
              {formatDayRange(visibleDays)}
            </p>
            <button
              type="button"
              onClick={() => shiftPage(1)}
              disabled={!canGoNext}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:border-brand-bright/50 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              aria-label="Later days"
            >
              Later →
            </button>
          </div>

          <div className="space-y-3">
            {visibleDays.map((day) => (
              <div key={day.date}>
                <p className="text-xs font-bold text-gray-900 mb-1.5">
                  {day.weekday}, {day.monthShort} {day.dayNumber}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {day.slots.map((slot) => (
                    <button
                      key={slot.slotKey}
                      type="button"
                      onClick={() => handleSelectSlot(slot)}
                      className={`px-2 py-2 rounded-lg border text-left transition-all ${
                        selectedSlotKey === slot.slotKey
                          ? "border-brand bg-brand text-white"
                          : "border-gray-200 hover:border-brand bg-white text-gray-800"
                      }`}
                    >
                      <span className="block text-xs font-semibold leading-tight">
                        {slot.displayTime}
                      </span>
                      <span
                        className={`block text-[10px] mt-0.5 leading-tight truncate ${
                          selectedSlotKey === slot.slotKey ? "text-white/85" : "text-gray-500"
                        }`}
                      >
                        {slot.groomerName.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
