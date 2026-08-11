"use client";

import { useMemo } from "react";
import {
  BOOKABLE_GROOMER_IDS,
  bookingBlockStartsForGroomer,
  bookingDurationMinutesForGroomer,
  formatBookingBlockDisplay,
  formatDisplayTime,
  GROOMERS,
  TIME_SLOT_OPTIONS,
  WORK_END_HOUR,
} from "@/lib/scheduling/groomers";
import { getTodayPacificDate, isSlotTaken, isVanSlotTaken } from "@/lib/scheduling/slots";
import { useStaffAppointmentsForPicker } from "@/lib/scheduling/use-staff-appointments-cache";
import { vanForGroomer } from "@/lib/scheduling/vans";
import type { GroomerId } from "@/lib/scheduling/types";

export function buildSlotKey(groomerId: GroomerId, date: string, time: string): string {
  return `${groomerId}|${date}|${time}`;
}

function formatHourlySlotLabel(time: string, durationMinutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const endMinutes = h * 60 + (m ?? 0) + durationMinutes;
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  return `${formatDisplayTime(time)} – ${formatDisplayTime(endTime)}`;
}

function slotEndWithinWorkDay(time: string, durationMinutes: number): boolean {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m ?? 0) + durationMinutes <= WORK_END_HOUR * 60;
}

export default function StaffDateTimePicker({
  groomerId,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  allowGroomerPick = false,
  onSelectGroomer,
  excludeAppointmentId,
  visitDurationMinutes,
  flexibleStartTimes = false,
}: {
  groomerId: GroomerId;
  selectedDate: string;
  selectedTime: string;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  allowGroomerPick?: boolean;
  onSelectGroomer?: (groomerId: GroomerId) => void;
  /** When rescheduling, ignore this appointment when checking conflicts. */
  excludeAppointmentId?: string;
  /** Override default block length (multi-dog bookings). */
  visitDurationMinutes?: number;
  /** Hourly start times instead of standard shift blocks. */
  flexibleStartTimes?: boolean;
}) {
  const minDate = useMemo(() => getTodayPacificDate(), []);
  const appointments = useStaffAppointmentsForPicker(groomerId);

  const visitDuration =
    visitDurationMinutes ?? bookingDurationMinutesForGroomer(groomerId);

  const startTimes = useMemo(() => {
    if (flexibleStartTimes) {
      return TIME_SLOT_OPTIONS.filter((time) =>
        slotEndWithinWorkDay(time, visitDuration)
      );
    }
    return [...bookingBlockStartsForGroomer(groomerId)];
  }, [flexibleStartTimes, groomerId, visitDuration]);

  const takenBlocks = useMemo(() => {
    if (!selectedDate) return new Set<string>();
    return new Set(
      startTimes.filter(
        (time) =>
          isSlotTaken(
            groomerId,
            selectedDate,
            time,
            visitDuration,
            appointments,
            excludeAppointmentId
          ) ||
          isVanSlotTaken(
            selectedDate,
            time,
            visitDuration,
            appointments,
            excludeAppointmentId,
            vanForGroomer(groomerId),
            undefined,
            groomerId
          )
      )
    );
  }, [
    appointments,
    excludeAppointmentId,
    groomerId,
    selectedDate,
    startTimes,
    visitDuration,
  ]);

  return (
    <div className="space-y-4">
      {allowGroomerPick && onSelectGroomer && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Groomer</label>
          <select
            value={groomerId}
            onChange={(e) => onSelectGroomer(e.target.value as GroomerId)}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-sm"
          >
            {BOOKABLE_GROOMER_IDS.map((id) => (
              <option key={id} value={id}>
                {GROOMERS[id].name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
        <input
          type="date"
          value={selectedDate}
          min={minDate}
          onChange={(e) => onSelectDate(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Staff can book any future date. Booked blocks are disabled.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Start time</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
          {startTimes.map((time) => {
            const selected = selectedTime === time;
            const taken = takenBlocks.has(time);
            const label = flexibleStartTimes
              ? formatHourlySlotLabel(time, visitDuration)
              : formatBookingBlockDisplay(time, groomerId);
            return (
              <button
                key={time}
                type="button"
                onClick={() => !taken && onSelectTime(time)}
                disabled={!selectedDate || taken}
                title={taken ? "Already booked" : undefined}
                className={`px-4 py-3 rounded-xl text-sm font-semibold border transition-colors text-left disabled:opacity-50 ${
                  taken
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : selected
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-brand border-gray-200 hover:border-accent"
                }`}
              >
                {label}
                {taken ? " · booked" : ""}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
