import { parseSlotFromIso } from "./slots";
import type { Appointment, GroomerId } from "./types";

/** Maximum confirmed appointments per groomer per calendar day. */
export const MAX_APPOINTMENTS_PER_DAY = 4;

export function countGroomerAppointmentsOnDate(
  groomerId: GroomerId,
  date: string,
  appointments: Appointment[],
  excludeAppointmentId?: string
): number {
  return appointments.filter((ap) => {
    if (ap.id === excludeAppointmentId) return false;
    if (ap.groomerId !== groomerId || ap.status === "cancelled") return false;
    return parseSlotFromIso(ap.startAt).date === date;
  }).length;
}

export function isGroomerFullyBooked(
  groomerId: GroomerId,
  date: string,
  appointments: Appointment[],
  excludeAppointmentId?: string
): boolean {
  return (
    countGroomerAppointmentsOnDate(
      groomerId,
      date,
      appointments,
      excludeAppointmentId
    ) >= MAX_APPOINTMENTS_PER_DAY
  );
}
