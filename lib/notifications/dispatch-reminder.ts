import "server-only";
import { readSchedulingData, writeSchedulingData } from "@/lib/scheduling/store";
import type { Appointment } from "@/lib/scheduling/types";
import { sendReminderEmail, sendReminderSms, type ReminderKind } from "./reminders";

export async function dispatchAppointmentReminder(
  appointmentId: string,
  kind: ReminderKind
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

  if (kind === "24h") {
    if (!appointment.reminder24hEmailSentAt) {
      email = await sendReminderEmail(appointment, "24h");
      if (email) updated = { ...updated, reminder24hEmailSentAt: nowIso };
    }
    if (!appointment.reminder24hSmsSentAt && appointment.smsOptIn) {
      sms = await sendReminderSms(appointment, "24h");
      if (sms) updated = { ...updated, reminder24hSmsSentAt: nowIso };
    }
  } else {
    if (!appointment.reminder2hEmailSentAt) {
      email = await sendReminderEmail(appointment, "2h");
      if (email) updated = { ...updated, reminder2hEmailSentAt: nowIso };
    }
    if (!appointment.reminder2hSmsSentAt && appointment.smsOptIn) {
      sms = await sendReminderSms(appointment, "2h");
      if (sms) updated = { ...updated, reminder2hSmsSentAt: nowIso };
    }
  }

  if (updated !== appointment) {
    const appointments = [...data.appointments];
    appointments[index] = updated;
    await writeSchedulingData({ ...data, appointments });
  }

  return { email, sms };
}
