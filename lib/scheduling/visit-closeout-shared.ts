import type { Appointment, GroomerId } from "@/lib/scheduling/types";
import { appointmentEnded } from "@/lib/analytics/visits";

/** Groomer may open the closeout form for their confirmed, unclosed appointments (any time). */
export function canGroomerEditCloseout(
  appointment: Appointment,
  groomerId: GroomerId
): boolean {
  if (appointment.groomerId !== groomerId) return false;
  if (appointment.visitClosedAt) return true;
  if (appointment.status === "cancelled") return false;
  return appointment.status === "confirmed";
}

/** @deprecated Use canGroomerEditCloseout */
export function canGroomerCloseVisit(
  appointment: Appointment,
  groomerId: GroomerId
): boolean {
  return canGroomerEditCloseout(appointment, groomerId);
}

export function appointmentNeedsCloseout(
  appointment: Appointment,
  now = Date.now()
): boolean {
  return (
    appointment.status === "confirmed" &&
    !appointment.visitClosedAt &&
    appointmentEnded(appointment, now)
  );
}
