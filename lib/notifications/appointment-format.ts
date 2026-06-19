import "server-only";
import type { Appointment } from "@/lib/scheduling/types";
import { GROOMERS } from "@/lib/scheduling/groomers";
import { getServiceLabel } from "@/lib/pricing";

export const APPOINTMENT_TZ = "America/Los_Angeles";

export function formatAppointmentWhen(appointment: Appointment): {
  dateLine: string;
  timeRange: string;
  smsWhen: string;
  startTime: string;
} {
  const start = new Date(appointment.startAt);
  const end = new Date(start.getTime() + appointment.durationMinutes * 60 * 1000);

  const dateLine = start.toLocaleDateString("en-US", {
    timeZone: APPOINTMENT_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const startTime = start.toLocaleTimeString("en-US", {
    timeZone: APPOINTMENT_TZ,
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString("en-US", {
    timeZone: APPOINTMENT_TZ,
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    dateLine,
    timeRange: `${startTime} – ${endTime} PT`,
    smsWhen: `${dateLine} at ${startTime} PT`,
    startTime,
  };
}

export function appointmentSummaryLines(appointment: Appointment): {
  groomerName: string;
  serviceLabel: string;
  when: ReturnType<typeof formatAppointmentWhen>;
} {
  return {
    groomerName: GROOMERS[appointment.groomerId].name,
    serviceLabel: getServiceLabel(appointment.service),
    when: formatAppointmentWhen(appointment),
  };
}

export const REMINDER_24H_MS = 24 * 60 * 60 * 1000;
export const REMINDER_2H_MS = 2 * 60 * 60 * 1000;
/** Match Vercel cron interval (15 minutes). */
export const REMINDER_WINDOW_MS = 15 * 60 * 1000;

export function msUntilAppointment(appointment: Appointment, now = new Date()): number {
  return new Date(appointment.startAt).getTime() - now.getTime();
}

export function isInReminderWindow(
  msUntil: number,
  targetMs: number,
  windowMs = REMINDER_WINDOW_MS
): boolean {
  return msUntil > 0 && msUntil <= targetMs && msUntil > targetMs - windowMs;
}
