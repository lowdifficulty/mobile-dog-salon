"use client";

import { useMemo } from "react";
import {
  BOOKING_BLOCK_STARTS,
  formatBookingBlockDisplay,
  GROOMERS,
} from "@/lib/scheduling/groomers";
import { getTodayPacificDate } from "@/lib/scheduling/slots";
import type { GroomerId } from "@/lib/scheduling/types";

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
}: {
  groomerId: GroomerId;
  selectedDate: string;
  selectedTime: string;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  allowGroomerPick?: boolean;
  onSelectGroomer?: (groomerId: GroomerId) => void;
}) {
  const minDate = useMemo(() => getTodayPacificDate(), []);

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
          Staff can book any future date, even without availability set.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Time</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BOOKING_BLOCK_STARTS.map((time) => {
            const selected = selectedTime === time;
            return (
              <button
                key={time}
                type="button"
                onClick={() => onSelectTime(time)}
                disabled={!selectedDate}
                className={`px-4 py-3 rounded-xl text-sm font-semibold border transition-colors text-left disabled:opacity-50 ${
                  selected
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-brand border-gray-200 hover:border-accent"
                }`}
              >
                {formatBookingBlockDisplay(time)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
