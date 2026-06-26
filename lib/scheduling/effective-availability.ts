import { removeSlotsFromAvailability } from "./availability";
import { parseSlotFromIso } from "./slots";
import type {
  Appointment,
  AvailabilityDay,
  GroomerId,
  SchedulingData,
} from "./types";

/** Remove hourly slots covered by confirmed appointments on a given day. */
export function effectiveAvailabilityTimes(
  groomerId: GroomerId,
  date: string,
  times: string[],
  appointments: Appointment[]
): string[] {
  let result = times;
  for (const ap of appointments) {
    if (ap.groomerId !== groomerId || ap.status === "cancelled") continue;
    const slot = parseSlotFromIso(ap.startAt);
    if (slot.date !== date) continue;
    result = removeSlotsFromAvailability(result, slot.time, ap.durationMinutes);
  }
  return result;
}

/** Availability with booked hours removed — used for calendar display and groomer schedule views. */
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

/** Prevent groomer saves from re-opening hours that already have appointments. */
export function sanitizeGroomerAvailabilitySave(
  groomerId: GroomerId,
  incoming: AvailabilityDay[],
  appointments: Appointment[]
): AvailabilityDay[] {
  return incoming
    .map((day) => ({
      groomerId,
      date: day.date,
      times: effectiveAvailabilityTimes(groomerId, day.date, day.times, appointments),
    }))
    .filter((day) => day.times.length > 0);
}
