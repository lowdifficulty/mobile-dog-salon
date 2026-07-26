import { bookingDurationMinutesForGroomer } from "@/lib/scheduling/groomers";
import type { GroomerId } from "@/lib/scheduling/types";

/** Keep confirmed appointments in Upcoming for this long after the visit ends. */
export const STAFF_UPCOMING_GRACE_MS = 10 * 60 * 60 * 1000;

const DEFAULT_DURATION_MINUTES = 180;

export type StaffAppointmentFilter = "upcoming" | "past" | "all" | "recent";

export function parseStaffAppointmentFilter(
  value: string | null
): StaffAppointmentFilter {
  if (value === "past" || value === "all" || value === "recent") return value;
  return "upcoming";
}

function appointmentEndMs(appointment: {
  startAt: string;
  durationMinutes?: number;
  groomerId?: GroomerId;
}): number {
  const duration =
    appointment.durationMinutes ??
    (appointment.groomerId
      ? bookingDurationMinutesForGroomer(appointment.groomerId)
      : DEFAULT_DURATION_MINUTES);
  return new Date(appointment.startAt).getTime() + duration * 60 * 1000;
}

export function staffUpcomingCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - STAFF_UPCOMING_GRACE_MS);
}

export function isStaffUpcomingAppointment(
  appointment: { startAt: string; status: string; durationMinutes?: number; groomerId?: GroomerId },
  now: Date = new Date()
): boolean {
  if (appointment.status !== "confirmed") return false;
  return appointmentEndMs(appointment) + STAFF_UPCOMING_GRACE_MS >= now.getTime();
}

/** Cancelled always; confirmed visits that have finished. */
export function isStaffPastAppointment(
  appointment: {
    startAt: string;
    status: string;
    durationMinutes?: number;
    groomerId?: GroomerId;
  },
  now: Date = new Date()
): boolean {
  if (appointment.status === "cancelled") return true;
  if (appointment.status !== "confirmed") return false;
  return appointmentEndMs(appointment) <= now.getTime();
}

/** Upcoming (incl. 10hr post-visit grace) always; past confirmed when viewing Past or All. */
export function canStaffManageAppointment(
  appointment: {
    startAt: string;
    status: string;
    durationMinutes?: number;
    groomerId?: GroomerId;
  },
  filter: StaffAppointmentFilter,
  now: Date = new Date()
): boolean {
  if (appointment.status !== "confirmed") return false;
  if (isStaffUpcomingAppointment(appointment, now)) return true;
  if (filter === "past" || filter === "all" || filter === "recent") {
    return appointmentEndMs(appointment) <= now.getTime();
  }
  return false;
}

export function filterStaffAppointments<
  T extends {
    startAt: string;
    status: string;
    createdAt: string;
    durationMinutes?: number;
    groomerId?: GroomerId;
  },
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
