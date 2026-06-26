import { getAppointmentPets } from "@/lib/booking/pets";
import { appointmentPacificDate } from "@/lib/leads/filters";
import type { AnalyticsRange } from "@/lib/leads/analytics";
import { getTodayPacificDate } from "@/lib/scheduling/slots";
import type { Appointment } from "@/lib/scheduling/types";

export function appointmentEnded(appointment: Appointment, now = Date.now()): boolean {
  const endMs =
    new Date(appointment.startAt).getTime() +
    appointment.durationMinutes * 60 * 1000;
  return endMs <= now;
}

export function visitDateFullyPast(date: string): boolean {
  return date < getTodayPacificDate();
}

function viewPacificDate(
  range: AnalyticsRange,
  customDate?: string
): string | null {
  if (range === "today") return getTodayPacificDate();
  if (range === "custom" && customDate) return customDate;
  return null;
}

export function appointmentInVisitRange(
  startAt: string,
  range: AnalyticsRange,
  customDate?: string,
  now = Date.now()
): boolean {
  const apDate = appointmentPacificDate(startAt);
  const apMs = new Date(startAt).getTime();
  if (Number.isNaN(apMs)) return false;

  if (range === "all") return true;
  if (range === "today") return apDate === getTodayPacificDate();
  if (range === "custom") {
    if (!customDate) return false;
    return apDate === customDate;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  if (range === "week") return apMs >= now - 7 * dayMs;
  if (range === "month") return apMs >= now - 30 * dayMs;

  return true;
}

export function isCompletedVisitForAnalytics(
  appointment: Appointment,
  range: AnalyticsRange,
  customDate?: string,
  now = Date.now()
): boolean {
  if (appointment.status !== "confirmed") return false;
  if (!appointmentInVisitRange(appointment.startAt, range, customDate, now)) {
    return false;
  }

  const day = viewPacificDate(range, customDate);
  if (day && visitDateFullyPast(day)) {
    return true;
  }

  return appointmentEnded(appointment, now);
}

export function completedVisitsInRange(
  appointments: Appointment[],
  range: AnalyticsRange,
  customDate?: string,
  now = Date.now()
): Appointment[] {
  return appointments.filter((ap) =>
    isCompletedVisitForAnalytics(ap, range, customDate, now)
  );
}

export function countDogsInAppointments(appointments: Appointment[]): number {
  return appointments.reduce(
    (sum, ap) => sum + Math.max(1, getAppointmentPets(ap).length),
    0
  );
}
