import "server-only";
import { readSchedulingData, writeSchedulingData } from "@/lib/scheduling/store";
import type { Appointment } from "@/lib/scheduling/types";
import { sendRebook3wEmail } from "./rebook-follow-up";
import { sendReminderEmail, sendReminderSms, type ReminderKind } from "./reminders";

function oneHourEmailAlreadySent(appointment: Appointment): boolean {
  return Boolean(appointment.reminder1hEmailSentAt || appointment.reminder2hEmailSentAt);
}

function oneHourSmsAlreadySent(appointment: Appointment): boolean {
  return Boolean(appointment.reminder1hSmsSentAt || appointment.reminder2hSmsSentAt);
}

export type DispatchKind = ReminderKind | "rebook-3w";

export async function dispatchAppointmentReminder(
  appointmentId: string,
  kind: DispatchKind
): Promise<{ email: boolean; sms: boolean }> {
  const data = await readSchedulingData();
  const index = data.appointments.findIndex((a) => a.id === appointmentId);

  if (index === -1) {
    throw new Error(`Appointment not found: ${appointmentId}`);
  }

  const appointment = data.appointments[index];
  if (appointment.status !== "confirmed") {
    return { email: false, sms: false };
  }

  const nowIso = new Date().toISOString();
  let email = false;
  let sms = false;
  let updated = appointment;

  if (kind === "rebook-3w") {
    if (!appointment.rebook3wEmailSentAt) {
      email = await sendRebook3wEmail(appointment);
      if (email) updated = { ...updated, rebook3wEmailSentAt: nowIso };
    }
  } else if (kind === "24h") {
    if (!appointment.reminder24hEmailSentAt) {
      email = await sendReminderEmail(appointment, "24h");
      if (email) updated = { ...updated, reminder24hEmailSentAt: nowIso };
    }
    if (!appointment.reminder24hSmsSentAt && appointment.smsOptIn) {
      sms = await sendReminderSms(appointment, "24h");
      if (sms) updated = { ...updated, reminder24hSmsSentAt: nowIso };
    }
  } else {
    if (!oneHourEmailAlreadySent(appointment)) {
      email = await sendReminderEmail(appointment, "1h");
      if (email) updated = { ...updated, reminder1hEmailSentAt: nowIso };
    }
    if (!oneHourSmsAlreadySent(appointment) && appointment.smsOptIn) {
      sms = await sendReminderSms(appointment, "1h");
      if (sms) updated = { ...updated, reminder1hSmsSentAt: nowIso };
    }
  }

  if (updated !== appointment) {
    const appointments = [...data.appointments];
    appointments[index] = updated;
    await writeSchedulingData({ ...data, appointments });
  }

  return { email, sms };
}
