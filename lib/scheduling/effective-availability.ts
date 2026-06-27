import { slotsCoveredByBooking } from "./availability";
import { isGroomerFullyBooked } from "./capacity";
import { parseSlotFromIso } from "./slots";
import type {
  Appointment,
  AvailabilityDay,
  GroomerId,
  SchedulingData,
} from "./types";

/** Remove hourly slots covered by confirmed appointments on a given day (display only). */
export function effectiveAvailabilityTimes(
  groomerId: GroomerId,
  date: string,
  times: string[],
  appointments: Appointment[]
): string[] {
  if (isGroomerFullyBooked(groomerId, date, appointments)) {
    return [];
  }

  let result = times;
  for (const ap of appointments) {
    if (ap.groomerId !== groomerId || ap.status === "cancelled") continue;
    const slot = parseSlotFromIso(ap.startAt);
    if (slot.date !== date) continue;
    const toRemove = new Set(slotsCoveredByBooking(slot.time, ap.durationMinutes));
    result = result.filter((t) => !toRemove.has(t)).sort();
  }
  return result;
}

/** Availability with booked hours removed — team calendar and public display. */
export function effectiveAvailability(data: SchedulingData): AvailabilityDay[] {
  return data.availability
    .map((day) => ({
      ...day,
      times: effectiveAvailabilityTimes(
        day.groomerId,
        day.date,
        day.times,
        data.appointments
      ),
    }))
    .filter((day) => day.times.length > 0);
}

/** Hourly slots covered by confirmed appointments — locked in the groomer schedule editor. */
export function appointmentLockedHourSlots(
  groomerId: GroomerId,
  appointments: Appointment[]
): Record<string, string[]> {
  const locked: Record<string, string[]> = {};

  for (const ap of appointments) {
    if (ap.groomerId !== groomerId || ap.status === "cancelled") continue;
    const slot = parseSlotFromIso(ap.startAt);
    const hours = slotsCoveredByBooking(slot.time, ap.durationMinutes);
    locked[slot.date] = [...new Set([...(locked[slot.date] ?? []), ...hours])].sort();
  }

  return locked;
}

/** Store the schedule the groomer sets; booking overlap is enforced at book time. */
export function normalizeGroomerAvailabilitySave(
  groomerId: GroomerId,
  incoming: AvailabilityDay[]
): AvailabilityDay[] {
  return incoming
    .map((day) => ({
      groomerId,
      date: day.date,
      times: [...new Set(day.times)].sort(),
    }))
    .filter((day) => day.times.length > 0);
}
