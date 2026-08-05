import "server-only";
import { readSchedulingData, writeSchedulingData } from "@/lib/scheduling/store";
import type { Appointment } from "@/lib/scheduling/types";
import {
  isInReminderWindow,
  msUntilAppointment,
  REMINDER_24H_MS,
  REMINDER_1H_MS,
} from "./appointment-format";
import { sendReminderEmail, sendReminderSms } from "./reminders";

export interface ReminderRunResult {
  scanned: number;
  sent24hEmail: number;
  sent24hSms: number;
  sent1hEmail: number;
  sent1hSms: number;
  errors: string[];
}

function oneHourEmailAlreadySent(appointment: Appointment): boolean {
  return Boolean(appointment.reminder1hEmailSentAt || appointment.reminder2hEmailSentAt);
}

function oneHourSmsAlreadySent(appointment: Appointment): boolean {
  return Boolean(appointment.reminder1hSmsSentAt || appointment.reminder2hSmsSentAt);
}

async function trySend24h(
  appointment: Appointment,
  nowIso: string,
  result: ReminderRunResult
): Promise<Appointment> {
  let current = appointment;
  const msUntil = msUntilAppointment(current);

  if (!isInReminderWindow(msUntil, REMINDER_24H_MS)) {
    return current;
  }

  if (!current.reminder24hEmailSentAt) {
    try {
      if (await sendReminderEmail(current, "24h")) {
        current = { ...current, reminder24hEmailSentAt: nowIso };
        result.sent24hEmail += 1;
      }
    } catch (err) {
      result.errors.push(
        `24h email failed for ${appointment.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (!current.reminder24hSmsSentAt && current.smsOptIn) {
    try {
      if (await sendReminderSms(current, "24h")) {
        current = { ...current, reminder24hSmsSentAt: nowIso };
        result.sent24hSms += 1;
      }
    } catch (err) {
      result.errors.push(
        `24h SMS failed for ${appointment.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return current;
}

async function trySend1h(
  appointment: Appointment,
  nowIso: string,
  result: ReminderRunResult
): Promise<Appointment> {
  let current = appointment;
  const msUntil = msUntilAppointment(current);

  if (!isInReminderWindow(msUntil, REMINDER_1H_MS)) {
    return current;
  }

  if (!oneHourEmailAlreadySent(current)) {
    try {
      if (await sendReminderEmail(current, "1h")) {
        current = { ...current, reminder1hEmailSentAt: nowIso };
        result.sent1hEmail += 1;
      }
    } catch (err) {
      result.errors.push(
        `1h email failed for ${appointment.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (!oneHourSmsAlreadySent(current) && current.smsOptIn) {
    try {
      if (await sendReminderSms(current, "1h")) {
        current = { ...current, reminder1hSmsSentAt: nowIso };
        result.sent1hSms += 1;
      }
    } catch (err) {
      result.errors.push(
        `1h SMS failed for ${appointment.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return current;
}

export async function processDueReminders(now = new Date()): Promise<ReminderRunResult> {
  const result: ReminderRunResult = {
    scanned: 0,
    sent24hEmail: 0,
    sent24hSms: 0,
    sent1hEmail: 0,
    sent1hSms: 0,
    errors: [],
  };

  const data = await readSchedulingData();
  const nowIso = now.toISOString();
  let changed = false;

  const updatedAppointments: Appointment[] = [];
  for (const appointment of data.appointments) {
    if (appointment.status !== "confirmed") {
      updatedAppointments.push(appointment);
      continue;
    }

    result.scanned += 1;
    const before = JSON.stringify(appointment);
    let current = appointment;
    current = await trySend24h(current, nowIso, result);
    current = await trySend1h(current, nowIso, result);

    if (JSON.stringify(current) !== before) {
      changed = true;
    }
    updatedAppointments.push(current);
  }

  if (changed) {
    await writeSchedulingData({ ...data, appointments: updatedAppointments });
  }

  return result;
}
