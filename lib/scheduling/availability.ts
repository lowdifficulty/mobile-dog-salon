import type { GroomerId, SchedulingData } from "./types";
import {
  BOOKING_DURATION_MINUTES,
  GROOMER_AVAILABILITY_BLOCK_MINUTES,
} from "./services";
import {
  availabilityBlockMinutesForGroomer,
  bookingBlockStartsForGroomer,
  bookingDurationMinutesForGroomer,
  isAllowedBookingBlockStart,
} from "./groomers";
import { parseSlotFromIso } from "./slots";

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

/** Groomer marked enough consecutive hours to book a 3-hour visit (2 hours min; 3rd assumed). */
export function hasMinimumAvailabilityForBooking(
  times: string[],
  startTime: string,
  durationMinutes: number = BOOKING_DURATION_MINUTES
): boolean {
  const minMarkedMinutes = Math.max(60, durationMinutes - 60);
  const set = new Set(times);
  const start = timeToMinutes(startTime);
  let markedMinutes = 0;

  for (let m = start; m < start + durationMinutes; m += 60) {
    const slot = minutesToTime(m);
    if (!set.has(slot)) break;
    markedMinutes += 60;
  }

  return markedMinutes >= minMarkedMinutes;
}

/** Hours blocked when an appointment starts at `startTime`. */
export function bookingBlockHours(
  startTime: string,
  durationMinutes: number = BOOKING_DURATION_MINUTES
): string[] {
  return slotsCoveredByBooking(startTime, durationMinutes);
}

export function listBookingBlockStarts(
  times: string[],
  groomerId: GroomerId,
  isTaken?: (startTime: string) => boolean
): string[] {
  const durationMinutes = availabilityBlockMinutesForGroomer(groomerId);
  const blockStarts = bookingBlockStartsForGroomer(groomerId);
  const offered: string[] = [];

  for (const time of blockStarts) {
    if (!hasMinimumAvailabilityForBooking(times, time, durationMinutes)) continue;
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

export function listSelfBookingStarts(
  times: string[],
  groomerId: GroomerId,
  isTaken?: (startTime: string) => boolean
): string[] {
  const duration = bookingDurationMinutesForGroomer(groomerId);
  return bookingBlockStartsForGroomer(groomerId).filter((time) => {
    if (!hasMinimumAvailabilityForBooking(times, time, duration)) return false;
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

export function isBookingBlockEnabled(
  times: string[],
  startTime: string,
  durationMinutes?: number
): boolean {
  const duration = durationMinutes ?? BOOKING_DURATION_MINUTES;
  return hasMinimumAvailabilityForBooking(times, startTime, duration);
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

/** Drop a groomer's shift block when no confirmed appointment remains at that start time. */
export function releaseGroomerShiftWithoutAppointment(
  data: SchedulingData,
  groomerId: GroomerId,
  date: string,
  startTime: string,
  options?: { ignoreAppointmentId?: string }
): void {
  if (!isAllowedBookingBlockStart(startTime, groomerId)) return;

  const hasConfirmed = data.appointments.some((ap) => {
    if (ap.status !== "confirmed") return false;
    if (options?.ignoreAppointmentId && ap.id === options.ignoreAppointmentId) return false;
    if (ap.groomerId !== groomerId) return false;
    const slot = parseSlotFromIso(ap.startAt);
    return slot.date === date && slot.time === startTime;
  });
  if (hasConfirmed) return;

  const dayIndex = data.availability.findIndex(
    (a) => a.groomerId === groomerId && a.date === date
  );
  if (dayIndex === -1) return;

  const times = setBookingBlockEnabled(
    data.availability[dayIndex].times,
    startTime,
    false,
    availabilityBlockMinutesForGroomer(groomerId)
  );
  if (times.length === 0) {
    data.availability.splice(dayIndex, 1);
  } else {
    data.availability[dayIndex] = { ...data.availability[dayIndex], times };
  }
}
