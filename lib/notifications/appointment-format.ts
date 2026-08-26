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

function compactStaffBookingWhen(appointment: Appointment): string {
  const start = new Date(appointment.startAt);
  const weekday = start.toLocaleDateString("en-US", {
    timeZone: APPOINTMENT_TZ,
    weekday: "short",
  });
  const month = start.toLocaleDateString("en-US", {
    timeZone: APPOINTMENT_TZ,
    month: "numeric",
  });
  const day = start.toLocaleDateString("en-US", {
    timeZone: APPOINTMENT_TZ,
    day: "numeric",
  });
  const time = start.toLocaleTimeString("en-US", {
    timeZone: APPOINTMENT_TZ,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${weekday} ${month}/${day} ${time}`;
}

function compactClientName(appointment: Appointment): string {
  const first = appointment.firstName.trim() || "Client";
  const last = appointment.lastName.trim();
  return last ? `${first} ${last[0]!.toUpperCase()}` : first;
}

function compactPetLabel(appointment: Appointment): string {
  const extra = appointment.additionalPets?.length ?? 0;
  const name = appointment.petName.trim() || "dog";
  return extra > 0 ? `${name}+${extra}` : name;
}

function compactSmsPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length === 10) {
    return `${ten.slice(0, 3)}-${ten.slice(3, 6)}-${ten.slice(6)}`;
  }
  return phone.trim();
}

const STAFF_BOOKING_SMS_MAX = 160;

function firstSmsUnderLimit(...candidates: string[]): string {
  for (const body of candidates) {
    if (body.length <= STAFF_BOOKING_SMS_MAX) return body;
  }
  return candidates[candidates.length - 1] ?? "";
}

function withOptionalUrl(cores: string[], detailsUrl?: string): string {
  const options = detailsUrl ? cores.map((core) => `${core} ${detailsUrl}`) : cores;
  return firstSmsUnderLimit(...options);
}

/** Groomer alert for a new booking — kept short for SMS, with optional CRM conversation link. */
export function groomerNewBookingSmsBody(
  appointment: Appointment,
  conversationUrl?: string
): string {
  const when = compactStaffBookingWhen(appointment);
  const name = compactClientName(appointment);
  const pet = compactPetLabel(appointment);
  const phone = compactSmsPhone(appointment.phone);
  const city = appointment.city.trim();
  return withOptionalUrl(
    [
      ...(city ? [`New: ${name}, ${pet}, ${when}, ${city}. ${phone}`] : []),
      `New: ${name}, ${pet}, ${when}. ${phone}`,
      `New: ${name}, ${pet}, ${when}.`,
    ],
    conversationUrl
  );
}

/** Owner alert: booking details plus remaining open slots over the next 7 days. */
export function ownerNewBookingSmsBody(
  appointment: Appointment,
  openNext7Days: number,
  detailsUrl?: string
): string {
  const when = compactStaffBookingWhen(appointment);
  const name = compactClientName(appointment);
  const pet = compactPetLabel(appointment);
  const groomer = GROOMERS[appointment.groomerId].name;
  const city = appointment.city.trim();
  const slots = `${openNext7Days} open next 7 days.`;
  return withOptionalUrl(
    [
      ...(city ? [`${groomer}: ${name}, ${pet}, ${when}, ${city}. ${slots}`] : []),
      `${groomer}: ${name}, ${pet}, ${when}. ${slots}`,
      `${groomer}: ${name}, ${when}. ${slots}`,
    ],
    detailsUrl
  );
}

export function formatBookingConfirmationSmsWhen(appointment: Appointment): string {
  const start = new Date(appointment.startAt);
  const weekday = start.toLocaleDateString("en-US", {
    timeZone: APPOINTMENT_TZ,
    weekday: "long",
  });
  const month = start.toLocaleDateString("en-US", {
    timeZone: APPOINTMENT_TZ,
    month: "numeric",
  });
  const day = start.toLocaleDateString("en-US", {
    timeZone: APPOINTMENT_TZ,
    day: "numeric",
  });
  const time = start.toLocaleTimeString("en-US", {
    timeZone: APPOINTMENT_TZ,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${weekday} ${month}/${day} at ${time}`;
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
export const REMINDER_1H_MS = 60 * 60 * 1000;
/** @deprecated use REMINDER_1H_MS */
export const REMINDER_2H_MS = REMINDER_1H_MS;
export const REBOOK_3W_MS = 21 * 24 * 60 * 60 * 1000;
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
