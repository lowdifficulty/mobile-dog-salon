export const STAFF_UPCOMING_GRACE_MS = 60 * 60 * 1000;

export type StaffAppointmentFilter = "upcoming" | "past" | "all";

export function staffUpcomingCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - STAFF_UPCOMING_GRACE_MS);
}

export function isStaffUpcomingAppointment(
  appointment: { startAt: string; status: string },
  now: Date = new Date()
): boolean {
  if (appointment.status !== "confirmed") return false;
  return new Date(appointment.startAt).getTime() >= staffUpcomingCutoff(now).getTime();
}

export function isStaffPastAppointment(
  appointment: { startAt: string; status: string },
  now: Date = new Date()
): boolean {
  if (appointment.status === "cancelled") return true;
  return new Date(appointment.startAt).getTime() < staffUpcomingCutoff(now).getTime();
}

export function filterStaffAppointments<T extends { startAt: string; status: string }>(
  appointments: T[],
  filter: StaffAppointmentFilter,
  now: Date = new Date()
): T[] {
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
