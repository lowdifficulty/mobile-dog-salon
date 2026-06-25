import type { GroomerId, SchedulingData } from "./types";
import { BOOKING_DURATION_MINUTES, GROOMER_AVAILABILITY_BLOCK_MINUTES } from "./services";
import { TIME_SLOT_OPTIONS } from "./groomers";

const SELF_BOOKING_HOURS = new Set<string>(TIME_SLOT_OPTIONS);

export function timeToMinutes(time: string): number {
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

/** Groomer marked the slot start hour open (extra hour can flex if needed). */
export function hasMinimumAvailabilityForBooking(
  times: string[],
  startTime: string
): boolean {
  return times.includes(startTime);
}

/** Hours blocked when an appointment starts at `startTime`. */
export function bookingBlockHours(
  startTime: string,
  durationMinutes: number = BOOKING_DURATION_MINUTES
): string[] {
  return slotsCoveredByBooking(startTime, durationMinutes);
}

/** List non-overlapping booking starts from groomer hour marks (staff / team calendar). */
export function listBookingBlockStarts(
  times: string[],
  durationMinutes: number = GROOMER_AVAILABILITY_BLOCK_MINUTES,
  isTaken?: (startTime: string) => boolean
): string[] {
  const sorted = [...new Set(times)].sort();
  const offered: string[] = [];

  for (const time of sorted) {
    if (!hasMinimumAvailabilityForBooking(times, time)) continue;
    if (isTaken?.(time)) continue;

    const startMin = timeToMinutes(time);
    const endMin = startMin + durationMinutes;
    const overlaps = offered.some((existing) => {
      const existingStart = timeToMinutes(existing);
      return startMin < existingStart + durationMinutes && endMin > existingStart;
    });
    if (overlaps) continue;

    offered.push(time);
  }

  return offered;
}

/**
 * Customer self-booking: hourly start times when groomer marked that hour open.
 * Only the start hour is required — appointment may extend past marked hours.
 */
export function listSelfBookingStarts(
  times: string[],
  isTaken?: (startTime: string) => boolean
): string[] {
  const sorted = [...new Set(times)].sort();
  return sorted.filter((time) => {
    if (!SELF_BOOKING_HOURS.has(time)) return false;
    if (!hasMinimumAvailabilityForBooking(times, time)) return false;
    if (isTaken?.(time)) return false;
    return true;
  });
}

export function setBookingBlockEnabled(
  times: string[],
  startTime: string,
  enabled: boolean,
  durationMinutes: number = GROOMER_AVAILABILITY_BLOCK_MINUTES
): string[] {
  const block = bookingBlockHours(startTime, durationMinutes);
  if (enabled) {
    return [...new Set([...times, ...block])].sort();
  }
  return times.filter((t) => !block.includes(t)).sort();
}

export function isBookingBlockEnabled(times: string[], startTime: string): boolean {
  return hasMinimumAvailabilityForBooking(times, startTime);
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

/** Return booked hours to groomer availability (cancel / reschedule old slot). */
export function restoreGroomerAvailability(
  data: SchedulingData,
  groomerId: GroomerId,
  date: string,
  startTime: string,
  durationMinutes: number = BOOKING_DURATION_MINUTES
): void {
  const slotsToAdd = slotsCoveredByBooking(startTime, durationMinutes);
  const dayIndex = data.availability.findIndex(
    (a) => a.groomerId === groomerId && a.date === date
  );

  if (dayIndex === -1) {
    data.availability.push({
      groomerId,
      date,
      times: [...slotsToAdd].sort(),
    });
    return;
  }

  const merged = new Set([...data.availability[dayIndex].times, ...slotsToAdd]);
  data.availability[dayIndex] = {
    ...data.availability[dayIndex],
    times: [...merged].sort(),
  };
}
