"use client";

import { useEffect, useMemo, useState } from "react";
import { isLocalhostHost } from "@/lib/booking/form-utils";
import type { AvailableSlot, GroomerId } from "@/lib/scheduling/types";
import { getTodayPacificDate } from "@/lib/scheduling/slots";
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
  groomerId?: GroomerId;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slot: AvailableSlot) => void;
  onAvailabilityMeta?: (meta: { fallbackMode: boolean; devAllSlots: boolean }) => void;
}

function filterDaysByGroomer(days: WeekDay[], groomerId?: GroomerId): WeekDay[] {
  if (!groomerId) return days;
  return days
    .map((day) => ({
      ...day,
      slots: day.slots.filter((slot) => slot.groomerId === groomerId),
    }))
    .filter((day) => day.isPast || day.slots.length > 0);
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
): Promise<{ days: WeekDay[]; devAllSlots: boolean }> {
  const res = await fetch(
    `/api/availability?from=${fromDate}&days=${DAYS_TO_FETCH}&service=${encodeURIComponent(service)}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error("Availability request failed");
  }
  const data = await res.json();
  return { days: data.days ?? [], devAllSlots: Boolean(data.devAllSlots) };
}

export default function WeekAvailabilityPicker({
  service,
  selectedDate: _selectedDate,
  selectedSlotKey,
  groomerId,
  onSelectDate,
  onSelectSlot,
  onAvailabilityMeta,
}: WeekAvailabilityPickerProps) {
  const [days, setDays] = useState<WeekDay[]>([]);
  const [pageStart, setPageStart] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [devAllSlots, setDevAllSlots] = useState(false);

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
      setDevAllSlots(false);
      setPageStart(0);

      const fromDate = getTodayPacificDate();

      if (isLocalhostHost()) {
        if (cancelled) return;
        const localDays = filterDaysByGroomer(
          buildFallbackRangeDays(fromDate, DAYS_TO_FETCH, groomerId),
          groomerId
        );
        setDays(localDays);
        setDevAllSlots(true);
        setFallbackMode(false);
        onAvailabilityMeta?.({ fallbackMode: false, devAllSlots: true });
        setLoading(false);
        return;
      }

      try {
        const result = await fetchAvailabilityRange(fromDate, service);
        if (cancelled) return;
        const filteredDays = filterDaysByGroomer(result.days, groomerId);
        const hasLiveSlots = filteredDays.some((day) => day.slots.length > 0);
        if (!hasLiveSlots) {
          setDays(
            filterDaysByGroomer(
              buildFallbackRangeDays(fromDate, DAYS_TO_FETCH, groomerId),
              groomerId
            )
          );
          setFallbackMode(true);
          setDevAllSlots(false);
          onAvailabilityMeta?.({ fallbackMode: true, devAllSlots: false });
        } else {
          setDays(filteredDays);
          setDevAllSlots(result.devAllSlots);
          setFallbackMode(false);
          onAvailabilityMeta?.({ fallbackMode: false, devAllSlots: result.devAllSlots });
        }
      } catch {
        if (cancelled) return;
        setDays(
          filterDaysByGroomer(
            buildFallbackRangeDays(fromDate, DAYS_TO_FETCH, groomerId),
            groomerId
          )
        );
        setDevAllSlots(false);
        setFallbackMode(true);
        onAvailabilityMeta?.({ fallbackMode: true, devAllSlots: false });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [service, groomerId, onAvailabilityMeta]);

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
      {devAllSlots && (
        <p className="text-xs text-gray-600 rounded-lg bg-white border border-gray-200 px-3 py-2">
          Localhost: all bookable time slots are shown for testing. Production only shows real
          groomer calendar availability.
        </p>
      )}

      {fallbackMode && (
        <p className="text-xs text-amber-800 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          We couldn&apos;t load live availability. All time slots are shown as open — your
          groomer will confirm your appointment.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-600">Loading availability…</p>
      ) : availableDays.length === 0 ? (
        <p className="text-sm text-gray-600 rounded-xl bg-white border border-gray-200 px-4 py-3">
          No open appointments in the next {DAYS_TO_FETCH} days
          {groomerId ? " for this groomer" : ""}. Check back soon — groomers post availability in
          their calendars.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shiftPage(-1)}
              disabled={!canGoPrev}
              className="booking-form-ghost-btn px-2.5 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              aria-label="Earlier days"
            >
              ← Earlier
            </button>
            <p className="text-xs font-semibold text-gray-800 text-center">
              {formatDayRange(visibleDays)}
            </p>
            <button
              type="button"
              onClick={() => shiftPage(1)}
              disabled={!canGoNext}
              className="booking-form-ghost-btn px-2.5 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              aria-label="Later days"
            >
              Later →
            </button>
          </div>

          <div className="space-y-3">
            {visibleDays.map((day) => (
              <div key={day.date}>
                <p className="text-xs font-bold text-gray-800 mb-1.5">
                  {day.weekday}, {day.monthShort} {day.dayNumber}
                </p>
                <div className="booking-form-slot-list">
                  {day.slots.map((slot, slotIndex) => {
                    const selected = selectedSlotKey === slot.slotKey;
                    const isFirst = slotIndex === 0;
                    const isLast = slotIndex === day.slots.length - 1;
                    const radiusClass = [
                      isFirst ? "rounded-t-lg" : "",
                      isLast ? "rounded-b-lg" : "border-b border-gray-200",
                    ].join(" ");
                    const stateClass = selected
                      ? "booking-form-slot-selected"
                      : "booking-form-slot";

                    return (
                      <button
                        key={slot.slotKey}
                        type="button"
                        onClick={() => handleSelectSlot(slot)}
                        className={`w-full px-4 py-4 text-left transition-colors ${radiusClass} ${stateClass}`}
                      >
                        <span className="block">
                          <span className="block text-base font-bold leading-snug">
                            {slot.displayTime}
                          </span>
                          <span
                            className={`block text-sm mt-1 leading-snug ${
                              selected ? "text-white/90" : "text-gray-600"
                            }`}
                          >
                            with {slot.groomerName}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
