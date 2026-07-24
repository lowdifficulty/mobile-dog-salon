import {
  bookingBlockHours,
  isBookingBlockEnabled,
  slotsCoveredByBooking,
} from "./availability";
import { isGroomerFullyBooked } from "./capacity";
import {
  availabilityBlockMinutesForGroomer,
  bookingBlockStartsForGroomer,
  SHIFT_HORIZON_MONTHS,
} from "./groomers";
import { appointmentBlockMinutes } from "./services";
import {
  getShiftHorizonEndDate,
  getTodayPacificDate,
  parseSlotFromIso,
} from "./slots";
import {
  availabilityVan,
  groomerHasMultiVanAccess,
  type VanId,
  vanForGroomer,
} from "./vans";
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
    const toRemove = new Set(
      slotsCoveredByBooking(slot.time, appointmentBlockMinutes(ap.durationMinutes))
    );
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
    const hours = slotsCoveredByBooking(
      slot.time,
      appointmentBlockMinutes(ap.durationMinutes)
    );
    locked[slot.date] = [...new Set([...(locked[slot.date] ?? []), ...hours])].sort();
  }

  return locked;
}

/** Store the schedule the groomer sets; booking overlap is enforced at book time. */
export function normalizeGroomerAvailabilitySave(
  groomerId: GroomerId,
  incoming: AvailabilityDay[],
  van?: VanId
): AvailabilityDay[] {
  const today = getTodayPacificDate();
  const maxDate = getShiftHorizonEndDate(SHIFT_HORIZON_MONTHS);

  const blockMinutes = availabilityBlockMinutesForGroomer(groomerId);
  const multiVan = groomerHasMultiVanAccess(groomerId);

  return incoming
    .map((day) => {
      const kept = new Set<string>();
      for (const start of bookingBlockStartsForGroomer(groomerId)) {
        if (!isBookingBlockEnabled(day.times, start, blockMinutes)) continue;
        for (const hour of bookingBlockHours(start, blockMinutes)) {
          kept.add(hour);
        }
      }
      return {
        groomerId,
        date: day.date,
        times: [...kept].sort(),
        ...(multiVan && van ? { van } : {}),
      };
    })
    .filter(
      (day) =>
        day.times.length > 0 &&
        day.date >= today &&
        day.date <= maxDate
    );
}

/** Replace one van's shifts while keeping the groomer's shifts on other vans. */
export function mergeGroomerVanAvailabilitySave(
  existing: AvailabilityDay[],
  groomerId: GroomerId,
  van: VanId,
  incomingForVan: AvailabilityDay[]
): AvailabilityDay[] {
  if (!groomerHasMultiVanAccess(groomerId)) {
    return [
      ...existing.filter((day) => day.groomerId !== groomerId),
      ...incomingForVan,
    ];
  }

  const kept = existing.filter((day) => {
    if (day.groomerId !== groomerId) return true;
    return availabilityVan(day) !== van;
  });

  return [...kept, ...incomingForVan];
}

/** Shifts for one groomer on one van (editor calendar rows). */
export function availabilityRowsForVan(
  availability: AvailabilityDay[],
  groomerId: GroomerId,
  van: VanId
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const day of availability) {
    if (day.groomerId !== groomerId) continue;
    if (availabilityVan(day) !== van) continue;
    map[day.date] = [...day.times];
  }
  return map;
}
