import "server-only";

import { randomUUID } from "crypto";
import {
  hasMinimumAvailabilityForBooking,
  isBookingBlockEnabled,
  releaseGroomerShiftWithoutAppointment,
  setBookingBlockEnabled,
} from "@/lib/scheduling/availability";
import {
  availabilityBlockMinutesForGroomer,
  bookingDurationMinutesForGroomer,
  groomerAcceptsBookings,
  isAllowedBookingBlockStart,
} from "@/lib/scheduling/groomers";
import { isGroomerFullyBooked } from "@/lib/scheduling/capacity";
import {
  isBookableDate,
  isSlotTaken,
  isVanSlotTaken,
  parseSlotFromIso,
  parseSlotKey,
  slotToISO,
} from "@/lib/scheduling/slots";
import { readSchedulingData, writeSchedulingData } from "@/lib/scheduling/store";
import { allocateShiftsFromAppointments } from "@/lib/scheduling/van-capacity";
import { consumeSlotHold, createSlotHold, validateSlotHold } from "@/lib/scheduling/slot-holds";
import {
  listRecurringStaffDates,
  staffRecurrenceLabel,
  type StaffRecurrenceFrequency,
} from "@/lib/scheduling/recurring-appointments";
import { vanForGroomer } from "@/lib/scheduling/vans";
import type { Appointment, AvailabilityDay, GroomerId } from "@/lib/scheduling/types";

export type AppointmentActionResult =
  | { ok: true; appointment: Appointment }
  | { ok: false; error: string; status: number };

export interface CreateAppointmentInput {
  slotKey?: string;
  groomerId?: GroomerId;
  date?: string;
  time?: string;
  petName?: string;
  petBreed?: string;
  petSize: string;
  additionalPets?: { petName: string; petSize: string }[];
  service: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  smsOptIn?: boolean;
  address: string;
  city?: string;
  zipCode: string;
  notes?: string;
}

export interface AppointmentMutationOptions {
  groomerId?: GroomerId;
  overrideAvailability?: boolean;
  allowSameDay?: boolean;
  /** Session owner id — required for customer bookings when holds are enabled. */
  holdOwnerId?: string;
  /** Staff/admin bookings skip hold checks. */
  skipHold?: boolean;
}

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

function resolveSlot(
  input: Pick<CreateAppointmentInput, "slotKey" | "groomerId" | "date" | "time">
): { groomerId: GroomerId; date: string; time: string } | { error: string } {
  if (input.slotKey) {
    try {
      return parseSlotKey(input.slotKey);
    } catch {
      return { error: "Invalid slot" };
    }
  }

  const { groomerId, date, time } = input;
  if (!groomerId || !date || !time) {
    return { error: "slotKey or groomerId, date, and time are required" };
  }

  return { groomerId, date, time };
}

export async function createAppointment(
  input: CreateAppointmentInput,
  actor: string,
  options?: AppointmentMutationOptions
): Promise<AppointmentActionResult> {
  const phoneTrimmed = input.phone?.trim() ?? "";
  if (!phoneTrimmed) {
    return { ok: false, error: "Phone number is required", status: 400 };
  }

  const street = String(input.address ?? "").trim();
  const cityName = String(input.city ?? "").trim();
  const zipTrimmed = String(input.zipCode ?? "").trim();

  if (!input.petSize || !input.service || !input.firstName || !input.lastName || !street) {
    return { ok: false, error: "Missing required fields", status: 400 };
  }

  if (!/^\d{5}(-\d{4})?$/.test(zipTrimmed)) {
    return { ok: false, error: "Please enter a valid ZIP code.", status: 400 };
  }

  const resolved = resolveSlot(input);
  if ("error" in resolved) {
    return { ok: false, error: resolved.error, status: 400 };
  }

  const { groomerId, date, time } = resolved;

  if (!groomerAcceptsBookings(groomerId)) {
    return {
      ok: false,
      error: "That groomer is not accepting new bookings.",
      status: 409,
    };
  }

  if (!isAllowedBookingBlockStart(time, groomerId)) {
    return {
      ok: false,
      error: "That time slot is not available. Shifts start at 8 AM, 11 AM, 2 PM, or 5 PM.",
      status: 400,
    };
  }

  if (options?.groomerId && groomerId !== options.groomerId) {
    return {
      ok: false,
      error: "You can only book appointments on your own schedule",
      status: 403,
    };
  }

  if (!options?.allowSameDay && !isBookableDate(date)) {
    return {
      ok: false,
      error: "Same-day appointments are not available. Please choose a future date.",
      status: 400,
    };
  }

  const data = await readSchedulingData();

  if (!options?.overrideAvailability) {
    const dayAvail = data.availability.find(
      (a) => a.groomerId === groomerId && a.date === date
    );
    if (!dayAvail || !hasMinimumAvailabilityForBooking(dayAvail.times, time, bookingDurationMinutesForGroomer(groomerId))) {
      return {
        ok: false,
        error: "Groomer is not available at that time",
        status: 409,
      };
    }
    if (isGroomerFullyBooked(groomerId, date, data.appointments)) {
      return {
        ok: false,
        error: "Groomer is fully booked on that day (4 appointments max)",
        status: 409,
      };
    }
  }

  const visitDuration = bookingDurationMinutesForGroomer(groomerId);

  if (isSlotTaken(groomerId, date, time, visitDuration, data.appointments)) {
    return { ok: false, error: "That time slot is no longer available", status: 409 };
  }

  if (
    isVanSlotTaken(
      date,
      time,
      visitDuration,
      data.appointments,
      undefined,
      vanForGroomer(groomerId),
      data.availability,
      groomerId
    )
  ) {
    return {
      ok: false,
      error: "That van is already booked at that time.",
      status: 409,
    };
  }

  const slotKeyForHold = input.slotKey ?? `${groomerId}|${date}|${time}`;
  if (!options?.skipHold) {
    let holdCheck = await validateSlotHold(options?.holdOwnerId, slotKeyForHold);
    if (!holdCheck.ok && options?.holdOwnerId) {
      const refreshed = await createSlotHold(options.holdOwnerId, slotKeyForHold);
      if (refreshed.ok) {
        holdCheck = await validateSlotHold(options.holdOwnerId, slotKeyForHold);
      }
    }
    if (!holdCheck.ok) {
      return { ok: false, error: holdCheck.error, status: 409 };
    }
  }

  const emailTrimmed = String(input.email ?? "").trim();
  const bookingEmail =
    emailTrimmed || `${phoneTrimmed.replace(/\D/g, "")}@booking.mobiledog-salon.com`;

  const appointment: Appointment = {
    id: randomUUID(),
    groomerId,
    van: vanForGroomer(groomerId),
    startAt: slotToISO(date, time),
    durationMinutes: bookingDurationMinutesForGroomer(groomerId),
    status: "confirmed",
    petName: input.petName?.trim() ?? "",
    petBreed: input.petBreed ?? "",
    petSize: input.petSize,
    additionalPets: Array.isArray(input.additionalPets)
      ? input.additionalPets.filter((pet) => pet?.petSize)
      : undefined,
    service: input.service,
    firstName: input.firstName,
    lastName: input.lastName,
    email: bookingEmail,
    phone: phoneTrimmed,
    smsOptIn: Boolean(input.smsOptIn),
    address: street,
    city: cityName || "Orange County",
    zipCode: zipTrimmed,
    notes: input.notes ?? "",
    createdAt: new Date().toISOString(),
  };

  data.appointments.push(appointment);
  await writeSchedulingData(data, {
    action: "booking",
    actor,
    groomerId,
  });

  if (!options?.skipHold) {
    await consumeSlotHold(options?.holdOwnerId, slotKeyForHold);
  }

  return { ok: true, appointment };
}

export type RecurringAppointmentResult =
  | {
      ok: true;
      appointments: Appointment[];
      skipped: { date: string; reason: string }[];
    }
  | { ok: false; error: string; status: number };

function buildAppointmentRecord(
  input: CreateAppointmentInput,
  groomerId: GroomerId,
  date: string,
  time: string,
  notes: string
): Appointment {
  const phoneTrimmed = input.phone?.trim() ?? "";
  const street = String(input.address ?? "").trim();
  const cityName = String(input.city ?? "").trim();
  const zipTrimmed = String(input.zipCode ?? "").trim();
  const emailTrimmed = String(input.email ?? "").trim();
  const bookingEmail =
    emailTrimmed || `${phoneTrimmed.replace(/\D/g, "")}@booking.mobiledog-salon.com`;

  return {
    id: randomUUID(),
    groomerId,
    van: vanForGroomer(groomerId),
    startAt: slotToISO(date, time),
    durationMinutes: bookingDurationMinutesForGroomer(groomerId),
    status: "confirmed",
    petName: input.petName?.trim() ?? "",
    petBreed: input.petBreed ?? "",
    petSize: input.petSize,
    additionalPets: Array.isArray(input.additionalPets)
      ? input.additionalPets.filter((pet) => pet?.petSize)
      : undefined,
    service: input.service,
    firstName: input.firstName,
    lastName: input.lastName,
    email: bookingEmail,
    phone: phoneTrimmed,
    smsOptIn: Boolean(input.smsOptIn),
    address: street,
    city: cityName || "Orange County",
    zipCode: zipTrimmed,
    notes,
    createdAt: new Date().toISOString(),
  };
}

function slotConflictReason(
  groomerId: GroomerId,
  date: string,
  time: string,
  appointments: Appointment[],
  availability: AvailabilityDay[] = []
): string | null {
  const visitDuration = bookingDurationMinutesForGroomer(groomerId);
  if (isSlotTaken(groomerId, date, time, visitDuration, appointments)) {
    return "Groomer already booked at that time";
  }

  if (
    isVanSlotTaken(
      date,
      time,
      visitDuration,
      appointments,
      undefined,
      vanForGroomer(groomerId),
      availability,
      groomerId
    )
  ) {
    return "Van already booked at that time";
  }

  return null;
}

export async function createRecurringAppointments(
  input: CreateAppointmentInput,
  actor: string,
  recurrence: StaffRecurrenceFrequency,
  options?: AppointmentMutationOptions
): Promise<RecurringAppointmentResult> {
  if (recurrence === "none") {
    const single = await createAppointment(input, actor, options);
    if (!single.ok) {
      return { ok: false, error: single.error, status: single.status };
    }
    return { ok: true, appointments: [single.appointment], skipped: [] };
  }

  const phoneTrimmed = input.phone?.trim() ?? "";
  if (!phoneTrimmed) {
    return { ok: false, error: "Phone number is required", status: 400 };
  }

  const street = String(input.address ?? "").trim();
  const cityName = String(input.city ?? "").trim();
  const zipTrimmed = String(input.zipCode ?? "").trim();

  if (!input.petSize || !input.service || !input.firstName || !input.lastName || !street) {
    return { ok: false, error: "Missing required fields", status: 400 };
  }

  if (!/^\d{5}(-\d{4})?$/.test(zipTrimmed)) {
    return { ok: false, error: "Please enter a valid ZIP code.", status: 400 };
  }

  const resolved = resolveSlot(input);
  if ("error" in resolved) {
    return { ok: false, error: resolved.error, status: 400 };
  }

  const { groomerId, date: startDate, time } = resolved;

  if (!groomerAcceptsBookings(groomerId)) {
    return {
      ok: false,
      error: "That groomer is not accepting new bookings.",
      status: 409,
    };
  }

  if (!isAllowedBookingBlockStart(time, groomerId)) {
    return {
      ok: false,
      error: "That time slot is not available. Shifts start at 8 AM, 11 AM, 2 PM, or 5 PM.",
      status: 400,
    };
  }

  if (options?.groomerId && groomerId !== options.groomerId) {
    return {
      ok: false,
      error: "You can only book appointments on your own schedule",
      status: 403,
    };
  }

  const dates = listRecurringStaffDates(startDate, recurrence);
  const data = await readSchedulingData();
  const created: Appointment[] = [];
  const skipped: { date: string; reason: string }[] = [];
  const recurrenceNote = `Recurring: ${staffRecurrenceLabel(recurrence)}.`;
  const baseNotes = input.notes?.trim() ?? "";
  const notes = baseNotes ? `${baseNotes}\n${recurrenceNote}` : recurrenceNote;

  for (const date of dates) {
    if (!options?.allowSameDay && !isBookableDate(date)) {
      skipped.push({ date, reason: "Same-day booking not allowed" });
      continue;
    }

    if (!options?.overrideAvailability) {
      const dayAvail = data.availability.find(
        (a) => a.groomerId === groomerId && a.date === date
      );
      if (!dayAvail || !hasMinimumAvailabilityForBooking(dayAvail.times, time, bookingDurationMinutesForGroomer(groomerId))) {
        skipped.push({ date, reason: "Groomer not available at that time" });
        continue;
      }
      if (isGroomerFullyBooked(groomerId, date, data.appointments)) {
        skipped.push({ date, reason: "Groomer fully booked that day" });
        continue;
      }
    }

    const conflict = slotConflictReason(
      groomerId,
      date,
      time,
      data.appointments,
      data.availability
    );
    if (conflict) {
      skipped.push({ date, reason: conflict });
      continue;
    }

    const appointment = buildAppointmentRecord(input, groomerId, date, time, notes);
    data.appointments.push(appointment);
    created.push(appointment);
  }

  if (created.length === 0) {
    const firstReason = skipped[0]?.reason ?? "No dates could be booked";
    return { ok: false, error: firstReason, status: 409 };
  }

  await writeSchedulingData(data, {
    action: "booking",
    actor,
    groomerId,
  });

  return { ok: true, appointments: created, skipped };
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
  releaseGroomerShiftWithoutAppointment(data, appointment.groomerId, date, time, {
    ignoreAppointmentId: appointment.id,
  });
  data.availability = allocateShiftsFromAppointments(data);

  await writeSchedulingData(data, {
    action: "appointment_cancel",
    actor,
    groomerId: appointment.groomerId,
  });

  return { ok: true, appointment };
}

export async function deleteAppointment(
  appointmentId: string,
  actor: string,
  options?: { groomerId?: GroomerId }
): Promise<AppointmentActionResult> {
  const data = await readSchedulingData();
  const index = data.appointments.findIndex((a) => a.id === appointmentId);
  if (index === -1) {
    return { ok: false, error: "Appointment not found", status: 404 };
  }

  const appointment = data.appointments[index];
  if (options?.groomerId && appointment.groomerId !== options.groomerId) {
    return { ok: false, error: "Appointment not found", status: 404 };
  }

  const { date, time } = parseSlotFromIso(appointment.startAt);
  releaseGroomerShiftWithoutAppointment(data, appointment.groomerId, date, time, {
    ignoreAppointmentId: appointment.id,
  });

  data.appointments.splice(index, 1);
  data.availability = allocateShiftsFromAppointments(data);

  await writeSchedulingData(data, {
    action: "appointment_delete",
    actor,
    groomerId: appointment.groomerId,
  });

  return { ok: true, appointment };
}

export async function rescheduleAppointment(
  appointmentId: string,
  slotKey: string,
  actor: string,
  options?: AppointmentMutationOptions
): Promise<AppointmentActionResult> {
  let groomerId: GroomerId;
  let date: string;
  let time: string;

  try {
    ({ groomerId, date, time } = parseSlotKey(slotKey));
  } catch {
    return { ok: false, error: "Invalid slot", status: 400 };
  }

  if (!isAllowedBookingBlockStart(time, groomerId)) {
    return {
      ok: false,
      error: "That time slot is not available. Shifts start at 8 AM, 11 AM, 2 PM, or 5 PM.",
      status: 400,
    };
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

  releaseGroomerShiftWithoutAppointment(
    data,
    appointment.groomerId,
    oldSlot.date,
    oldSlot.time,
    { ignoreAppointmentId: appointment.id }
  );

  if (!options?.overrideAvailability) {
    const dayAvail = data.availability.find(
      (a) => a.groomerId === groomerId && a.date === date
    );
    if (
      !dayAvail ||
      !hasMinimumAvailabilityForBooking(dayAvail.times, time)
    ) {
      return {
        ok: false,
        error: "Groomer is not available at that time",
        status: 409,
      };
    }
    if (
      isGroomerFullyBooked(
        groomerId,
        date,
        data.appointments,
        appointment.id
      )
    ) {
      return {
        ok: false,
        error: "Groomer is fully booked on that day (4 appointments max)",
        status: 409,
      };
    }
  }

  const visitDuration = bookingDurationMinutesForGroomer(groomerId);

  if (
    isSlotTaken(
      groomerId,
      date,
      time,
      visitDuration,
      data.appointments,
      appointment.id
    )
  ) {
    return { ok: false, error: "That time slot is no longer available", status: 409 };
  }

  if (
    isVanSlotTaken(
      date,
      time,
      visitDuration,
      data.appointments,
      appointment.id,
      vanForGroomer(groomerId),
      data.availability,
      groomerId
    )
  ) {
    return {
      ok: false,
      error: "That van is already booked at that time.",
      status: 409,
    };
  }

  appointment.groomerId = groomerId;
  appointment.van = vanForGroomer(groomerId);
  appointment.startAt = slotToISO(date, time);
  appointment.durationMinutes = bookingDurationMinutesForGroomer(groomerId);
  appointment.status = "confirmed";
  clearReminderFlags(appointment);
  data.availability = allocateShiftsFromAppointments(data);

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

  if (!groomerAcceptsBookings(toGroomerId)) {
    return {
      ok: false,
      error: "That groomer is not accepting new bookings.",
      status: 409,
    };
  }

  const fromGroomerId = appointment.groomerId;
  const { date, time } = parseSlotFromIso(appointment.startAt);
  const toBlockMinutes = availabilityBlockMinutesForGroomer(toGroomerId);

  // Accepting a transfer accepts that shift — open it on the receiving calendar if needed.
  const dayIndex = data.availability.findIndex(
    (a) => a.groomerId === toGroomerId && a.date === date
  );
  if (dayIndex >= 0) {
    const day = data.availability[dayIndex];
    if (!isBookingBlockEnabled(day.times, time, toBlockMinutes)) {
      data.availability[dayIndex] = {
        ...day,
        times: setBookingBlockEnabled(day.times, time, true, toBlockMinutes),
      };
    }
  } else {
    data.availability.push({
      groomerId: toGroomerId,
      date,
      times: setBookingBlockEnabled([], time, true, toBlockMinutes),
    });
  }

  if (isGroomerFullyBooked(toGroomerId, date, data.appointments, appointment.id)) {
    return {
      ok: false,
      error: "Groomer is fully booked on that day (4 appointments max)",
      status: 409,
    };
  }

  const visitDuration = bookingDurationMinutesForGroomer(toGroomerId);
  if (
    isSlotTaken(
      toGroomerId,
      date,
      time,
      visitDuration,
      data.appointments,
      appointment.id
    )
  ) {
    return {
      ok: false,
      error: "That groomer already has another appointment at that time",
      status: 409,
    };
  }

  if (
    isVanSlotTaken(
      date,
      time,
      visitDuration,
      data.appointments,
      appointment.id,
      vanForGroomer(toGroomerId),
      data.availability,
      toGroomerId
    )
  ) {
    return {
      ok: false,
      error: "That van is already booked at that time.",
      status: 409,
    };
  }

  releaseGroomerShiftWithoutAppointment(data, fromGroomerId, date, time, {
    ignoreAppointmentId: appointment.id,
  });

  appointment.groomerId = toGroomerId;
  appointment.van = vanForGroomer(toGroomerId);
  appointment.durationMinutes = visitDuration;
  clearReminderFlags(appointment);
  data.availability = allocateShiftsFromAppointments(data);

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
