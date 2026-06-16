import type { GroomerId, SchedulingData } from "./types";
import { BOOKING_DURATION_MINUTES } from "./services";

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Hourly slots covered by a booking (e.g. 10:00 + 120min → 10:00, 11:00). */
export function slotsCoveredByBooking(startTime: string, durationMinutes: number): string[] {
  const start = timeToMinutes(startTime);
  const covered: string[] = [];
  for (let m = start; m < start + durationMinutes; m += 60) {
    covered.push(minutesToTime(m));
  }
  return covered;
}

export function hasConsecutiveAvailability(
  times: string[],
  startTime: string,
  durationMinutes: number = BOOKING_DURATION_MINUTES
): boolean {
  const set = new Set(times);
  return slotsCoveredByBooking(startTime, durationMinutes).every((slot) => set.has(slot));
}

export function removeSlotsFromAvailability(
  times: string[],
  startTime: string,
  durationMinutes: number = BOOKING_DURATION_MINUTES
): string[] {
  const toRemove = new Set(slotsCoveredByBooking(startTime, durationMinutes));
  return times.filter((t) => !toRemove.has(t)).sort();
}

/** Remove booked hours from groomer availability so the slot cannot be double-booked. */
export function consumeGroomerAvailability(
  data: SchedulingData,
  groomerId: GroomerId,
  date: string,
  startTime: string,
  durationMinutes: number = BOOKING_DURATION_MINUTES
): void {
  const dayIndex = data.availability.findIndex(
    (a) => a.groomerId === groomerId && a.date === date
  );
  if (dayIndex === -1) return;

  const day = data.availability[dayIndex];
  const remaining = removeSlotsFromAvailability(day.times, startTime, durationMinutes);

  if (remaining.length === 0) {
    data.availability.splice(dayIndex, 1);
  } else {
    data.availability[dayIndex] = { ...day, times: remaining };
  }
}
