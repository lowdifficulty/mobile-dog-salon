import { bookingDurationMinutesForGroomer } from "@/lib/scheduling/groomers";
import { getTodayPacificDate, parseSlotFromIso } from "@/lib/scheduling/slots";
import type { GroomerId } from "@/lib/scheduling/types";

/** @deprecated Appointments stay in Upcoming until groomer closeout; kept for callers that reference it. */
export const STAFF_UPCOMING_GRACE_MS = 10 * 60 * 60 * 1000;

const DEFAULT_DURATION_MINUTES = 180;

export type StaffAppointmentFilter = "upcoming" | "past" | "all" | "recent";

type AppointmentFilterFields = {
  startAt: string;
  status: string;
  durationMinutes?: number;
  groomerId?: GroomerId;
  visitClosedAt?: string;
};

export function parseStaffAppointmentFilter(
  value: string | null
): StaffAppointmentFilter {
  if (value === "past" || value === "all" || value === "recent") return value;
  return "upcoming";
}

function appointmentEndMs(appointment: AppointmentFilterFields): number {
  const duration =
    appointment.durationMinutes ??
    (appointment.groomerId
      ? bookingDurationMinutesForGroomer(appointment.groomerId)
      : DEFAULT_DURATION_MINUTES);
  return new Date(appointment.startAt).getTime() + duration * 60 * 1000;
}

/** @deprecated Use closeout-based upcoming logic instead. */
export function staffUpcomingCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - STAFF_UPCOMING_GRACE_MS);
}

/** Appointment is scheduled today or later (Pacific calendar date). */
export function isAppointmentTodayOrFuture(
  appointment: AppointmentFilterFields,
  now: Date = new Date()
): boolean {
  const today = getTodayPacificDate();
  const { date } = parseSlotFromIso(appointment.startAt);
  return date >= today;
}

/** Confirmed or cancelled visits on today's calendar date or later. */
export function isStaffCalendarVisibleAppointment(
  appointment: AppointmentFilterFields,
  now: Date = new Date()
): boolean {
  if (appointment.status !== "confirmed" && appointment.status !== "cancelled") {
    return false;
  }
  return isAppointmentTodayOrFuture(appointment, now);
}

/** Confirmed visits that have not been closed out, from today onward. */
export function isStaffUpcomingAppointment(
  appointment: AppointmentFilterFields,
  now: Date = new Date()
): boolean {
  if (appointment.status !== "confirmed") return false;
  if (appointment.visitClosedAt) return false;
  return isAppointmentTodayOrFuture(appointment, now);
}

/** Cancelled visits, or confirmed visits the groomer has closed out. */
export function isStaffPastAppointment(
  appointment: AppointmentFilterFields,
  _now: Date = new Date()
): boolean {
  if (appointment.status === "cancelled") return true;
  if (appointment.status !== "confirmed") return false;
  return Boolean(appointment.visitClosedAt);
}

/** Manage until the groomer closes the appointment out. */
export function canStaffManageAppointment(
  appointment: AppointmentFilterFields,
  _filter: StaffAppointmentFilter,
  _now: Date = new Date()
): boolean {
  if (appointment.status !== "confirmed") return false;
  return !appointment.visitClosedAt;
}

export function filterStaffAppointments<
  T extends AppointmentFilterFields & { createdAt: string },
>(
  appointments: T[],
  filter: StaffAppointmentFilter,
  now: Date = new Date()
): T[] {
  if (filter === "recent") {
    return [...appointments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  if (filter === "all") {
    return [...appointments].sort((a, b) => b.startAt.localeCompare(a.startAt));
  }

  if (filter === "upcoming") {
    return appointments
      .filter((a) => isStaffUpcomingAppointment(a, now))
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }

  return appointments
    .filter((a) => isStaffPastAppointment(a, now))
    .sort((a, b) => b.startAt.localeCompare(a.startAt));
}

/** Whether the visit time has passed (for closeout eligibility). */
export function isStaffVisitEnded(
  appointment: AppointmentFilterFields,
  now: Date = new Date()
): boolean {
  return appointmentEndMs(appointment) <= now.getTime();
}
