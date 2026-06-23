import "server-only";

import {
  consumeGroomerAvailability,
  hasMinimumAvailabilityForBooking,
  restoreGroomerAvailability,
} from "@/lib/scheduling/availability";
import {
  isSlotTaken,
  parseSlotFromIso,
  parseSlotKey,
  slotToISO,
} from "@/lib/scheduling/slots";
import { readSchedulingData, writeSchedulingData } from "@/lib/scheduling/store";
import type { Appointment, GroomerId } from "@/lib/scheduling/types";

export type AppointmentActionResult =
  | { ok: true; appointment: Appointment }
  | { ok: false; error: string; status: number };

function clearReminderFlags(appointment: Appointment): void {
  delete appointment.reminder24hEmailSentAt;
  delete appointment.reminder24hSmsSentAt;
  delete appointment.reminder2hEmailSentAt;
  delete appointment.reminder2hSmsSentAt;
}

function findAppointment(
  appointments: Appointment[],
  appointmentId: string,
  groomerId?: GroomerId
): Appointment | null {
  const appointment = appointments.find((a) => a.id === appointmentId);
  if (!appointment) return null;
  if (groomerId && appointment.groomerId !== groomerId) return null;
  return appointment;
}

export async function cancelAppointment(
  appointmentId: string,
  actor: string,
  options?: { groomerId?: GroomerId }
): Promise<AppointmentActionResult> {
  const data = await readSchedulingData();
  const appointment = findAppointment(
    data.appointments,
    appointmentId,
    options?.groomerId
  );

  if (!appointment) {
    return { ok: false, error: "Appointment not found", status: 404 };
  }
  if (appointment.status === "cancelled") {
    return { ok: false, error: "Appointment is already cancelled", status: 409 };
  }

  const { date, time } = parseSlotFromIso(appointment.startAt);
  appointment.status = "cancelled";
  restoreGroomerAvailability(
    data,
    appointment.groomerId,
    date,
    time,
    appointment.durationMinutes
  );

  await writeSchedulingData(data, {
    action: "appointment_cancel",
    actor,
    groomerId: appointment.groomerId,
  });

  return { ok: true, appointment };
}

export async function rescheduleAppointment(
  appointmentId: string,
  slotKey: string,
  actor: string,
  options?: { groomerId?: GroomerId }
): Promise<AppointmentActionResult> {
  let groomerId: GroomerId;
  let date: string;
  let time: string;

  try {
    ({ groomerId, date, time } = parseSlotKey(slotKey));
  } catch {
    return { ok: false, error: "Invalid slot", status: 400 };
  }

  const data = await readSchedulingData();
  const appointment = findAppointment(
    data.appointments,
    appointmentId,
    options?.groomerId
  );

  if (!appointment) {
    return { ok: false, error: "Appointment not found", status: 404 };
  }
  if (appointment.status === "cancelled") {
    return { ok: false, error: "Cannot reschedule a cancelled appointment", status: 409 };
  }
  if (options?.groomerId && groomerId !== options.groomerId) {
    return {
      ok: false,
      error: "Choose one of your available time slots",
      status: 403,
    };
  }

  const oldSlot = parseSlotFromIso(appointment.startAt);
  const unchanged =
    appointment.groomerId === groomerId &&
    oldSlot.date === date &&
    oldSlot.time === time;

  if (unchanged) {
    return { ok: true, appointment };
  }

  const dayAvail = data.availability.find(
    (a) => a.groomerId === groomerId && a.date === date
  );
  if (
    !dayAvail ||
    !hasMinimumAvailabilityForBooking(dayAvail.times, time)
  ) {
    return {
      ok: false,
      error: "Groomer is not available for a 2-hour appointment at that time",
      status: 409,
    };
  }

  if (
    isSlotTaken(
      groomerId,
      date,
      time,
      appointment.durationMinutes,
      data.appointments,
      appointment.id
    )
  ) {
    return { ok: false, error: "That time slot is no longer available", status: 409 };
  }

  restoreGroomerAvailability(
    data,
    appointment.groomerId,
    oldSlot.date,
    oldSlot.time,
    appointment.durationMinutes
  );

  appointment.groomerId = groomerId;
  appointment.startAt = slotToISO(date, time);
  appointment.status = "confirmed";
  clearReminderFlags(appointment);

  consumeGroomerAvailability(
    data,
    groomerId,
    date,
    time,
    appointment.durationMinutes
  );

  await writeSchedulingData(data, {
    action: "appointment_reschedule",
    actor,
    groomerId: appointment.groomerId,
  });

  try {
    const { scheduleAppointmentReminders } = await import(
      "@/lib/notifications/schedule-reminders"
    );
    await scheduleAppointmentReminders(appointment);
  } catch (err) {
    console.error("Reminder reschedule failed:", err);
  }

  return { ok: true, appointment };
}

export async function transferAppointmentToGroomer(
  appointmentId: string,
  toGroomerId: GroomerId,
  actor: string
): Promise<AppointmentActionResult> {
  const data = await readSchedulingData();
  const appointment = findAppointment(data.appointments, appointmentId);

  if (!appointment) {
    return { ok: false, error: "Appointment not found", status: 404 };
  }
  if (appointment.status === "cancelled") {
    return { ok: false, error: "Cannot transfer a cancelled appointment", status: 409 };
  }
  if (appointment.groomerId === toGroomerId) {
    return { ok: true, appointment };
  }

  const { date, time } = parseSlotFromIso(appointment.startAt);
  const dayAvail = data.availability.find(
    (a) => a.groomerId === toGroomerId && a.date === date
  );
  if (!dayAvail || !hasMinimumAvailabilityForBooking(dayAvail.times, time)) {
    return {
      ok: false,
      error: "Groomer is not available for a 2-hour appointment at that time",
      status: 409,
    };
  }

  if (
    isSlotTaken(
      toGroomerId,
      date,
      time,
      appointment.durationMinutes,
      data.appointments,
      appointment.id
    )
  ) {
    return { ok: false, error: "That time slot is no longer available", status: 409 };
  }

  restoreGroomerAvailability(
    data,
    appointment.groomerId,
    date,
    time,
    appointment.durationMinutes
  );

  appointment.groomerId = toGroomerId;
  clearReminderFlags(appointment);

  consumeGroomerAvailability(
    data,
    toGroomerId,
    date,
    time,
    appointment.durationMinutes
  );

  await writeSchedulingData(data, {
    action: "appointment_reschedule",
    actor,
    groomerId: toGroomerId,
  });

  try {
    const { scheduleAppointmentReminders } = await import(
      "@/lib/notifications/schedule-reminders"
    );
    await scheduleAppointmentReminders(appointment);
  } catch (err) {
    console.error("Reminder reschedule failed:", err);
  }

  return { ok: true, appointment };
}
