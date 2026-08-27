import { appointmentEnded } from "@/lib/analytics/visits";
import type { Appointment, GroomerId } from "@/lib/scheduling/types";

export function canGroomerCloseVisit(
  appointment: Appointment,
  groomerId: GroomerId,
  now = Date.now()
): boolean {
  if (appointment.groomerId !== groomerId) return false;
  if (appointment.visitClosedAt) return true;
  if (appointment.status === "cancelled") return false;
  return appointmentEnded(appointment, now);
}

export function appointmentNeedsCloseout(
  appointment: Appointment,
  now = Date.now()
): boolean {
  return (
    appointment.status === "confirmed" &&
    appointmentEnded(appointment, now) &&
    !appointment.visitClosedAt
  );
}
