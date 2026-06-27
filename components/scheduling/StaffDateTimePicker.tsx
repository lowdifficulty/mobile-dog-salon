"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BOOKING_BLOCK_STARTS,
  formatBookingBlockDisplay,
  GROOMERS,
} from "@/lib/scheduling/groomers";
import { BOOKING_DURATION_MINUTES } from "@/lib/scheduling/services";
import { getTodayPacificDate, isSlotTaken } from "@/lib/scheduling/slots";
import type { Appointment, GroomerId } from "@/lib/scheduling/types";

export function buildSlotKey(groomerId: GroomerId, date: string, time: string): string {
  return `${groomerId}|${date}|${time}`;
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
}) {
  const minDate = useMemo(() => getTodayPacificDate(), []);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/staff/appointments?groomerId=${groomerId}&filter=upcoming`)
      .then((res) => (res.ok ? res.json() : { appointments: [] }))
      .then((data) => {
        if (!cancelled) setAppointments(data.appointments ?? []);
      })
      .catch(() => {
        if (!cancelled) setAppointments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [groomerId]);

  const takenBlocks = useMemo(() => {
    if (!selectedDate) return new Set<string>();
    return new Set(
      BOOKING_BLOCK_STARTS.filter((time) =>
        isSlotTaken(
          groomerId,
          selectedDate,
          time,
          BOOKING_DURATION_MINUTES,
          appointments,
          excludeAppointmentId
        )
      )
    );
  }, [appointments, excludeAppointmentId, groomerId, selectedDate]);

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
            {(Object.keys(GROOMERS) as GroomerId[]).map((id) => (
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
          Staff can book any future date. Each slot is a 3-hour visit — booked blocks are disabled.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Time</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BOOKING_BLOCK_STARTS.map((time) => {
            const selected = selectedTime === time;
            const taken = takenBlocks.has(time);
            return (
              <button
                key={time}
                type="button"
                onClick={() => !taken && onSelectTime(time)}
                disabled={!selectedDate || taken}
                title={taken ? "Already booked — 3-hour block in use" : undefined}
                className={`px-4 py-3 rounded-xl text-sm font-semibold border transition-colors text-left disabled:opacity-50 ${
                  taken
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : selected
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-brand border-gray-200 hover:border-accent"
                }`}
              >
                {formatBookingBlockDisplay(time)}
                {taken ? " · booked" : ""}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
