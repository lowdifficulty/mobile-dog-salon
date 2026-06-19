import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readSchedulingData, writeSchedulingData } from "@/lib/scheduling/store";
import {
  isBookableDate,
  isSlotTaken,
  parseSlotKey,
  slotToISO,
} from "@/lib/scheduling/slots";
import { BOOKING_DURATION_MINUTES } from "@/lib/scheduling/services";
import {
  consumeGroomerAvailability,
  hasMinimumAvailabilityForBooking,
} from "@/lib/scheduling/availability";
import { sendCalendarInvites } from "@/lib/scheduling/calendar";
import { upsertLead } from "@/lib/leads/store";
import type { Appointment } from "@/lib/scheduling/types";

export async function POST(request: Request) {
  const body = await request.json();

  const {
    slotKey,
    petName,
    petBreed,
    petSize,
    service,
    firstName,
    lastName,
    email,
    phone,
    smsOptIn,
    address,
    city,
    zipCode,
    notes,
  } = body;

  if (
    !slotKey ||
    !petName ||
    !service ||
    !firstName ||
    !lastName ||
    !email ||
    !address ||
    !city ||
    !zipCode
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const zipTrimmed = String(zipCode).trim();
  if (!/^\d{5}(-\d{4})?$/.test(zipTrimmed)) {
    return NextResponse.json({ error: "Invalid ZIP code" }, { status: 400 });
  }

  const phoneTrimmed = phone?.trim() ?? "";
  if (smsOptIn && !phoneTrimmed) {
    return NextResponse.json({ error: "Phone number required for SMS opt-in" }, { status: 400 });
  }
  if (!phoneTrimmed) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  let groomerId, date, time;
  try {
    ({ groomerId, date, time } = parseSlotKey(slotKey));
  } catch {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }

  if (!isBookableDate(date)) {
    return NextResponse.json(
      { error: "Same-day appointments are not available. Please choose a future date." },
      { status: 400 }
    );
  }

  const data = await readSchedulingData();

  const dayAvail = data.availability.find(
    (a) => a.groomerId === groomerId && a.date === date
  );
  if (!dayAvail || !hasMinimumAvailabilityForBooking(dayAvail.times, time)) {
    return NextResponse.json({ error: "Groomer is not available for a 2-hour appointment at that time" }, { status: 409 });
  }

  if (isSlotTaken(groomerId, date, time, BOOKING_DURATION_MINUTES, data.appointments)) {
    return NextResponse.json({ error: "That time slot is no longer available" }, { status: 409 });
  }

  const appointment: Appointment = {
    id: randomUUID(),
    groomerId,
    startAt: slotToISO(date, time),
    durationMinutes: BOOKING_DURATION_MINUTES,
    status: "confirmed",
    petName,
    petBreed: petBreed ?? "",
    petSize: petSize ?? "",
    service,
    firstName,
    lastName,
    email,
    phone: phone?.trim() ?? "",
    smsOptIn: Boolean(smsOptIn),
    address,
    city,
    zipCode: zipTrimmed,
    notes: notes ?? "",
    createdAt: new Date().toISOString(),
  };

  data.appointments.push(appointment);
  consumeGroomerAvailability(data, groomerId, date, time, BOOKING_DURATION_MINUTES);
  await writeSchedulingData(data, {
    action: "booking",
    actor: email,
    groomerId,
  });

  try {
    await upsertLead({
      funnelStep: "scheduled",
      phone: appointment.phone,
      email: appointment.email,
      firstName: appointment.firstName,
      lastName: appointment.lastName,
      petName: appointment.petName,
      petSize: appointment.petSize,
      service: appointment.service,
      address: appointment.address,
      city: appointment.city,
      zipCode: appointment.zipCode,
      smsOptIn: appointment.smsOptIn,
      discountActive: Boolean(smsOptIn),
      appointmentId: appointment.id,
      scheduledAt: appointment.createdAt,
      source: "booking",
    });
  } catch (err) {
    console.error("Lead sync failed:", err);
  }

  try {
    await sendCalendarInvites(appointment);
  } catch (err) {
    console.error("Calendar invite failed:", err);
  }

  try {
    const { sendBookingConfirmations } = await import("@/lib/notifications/booking-confirmation");
    await sendBookingConfirmations(appointment);
  } catch (err) {
    console.error("Customer confirmation notifications failed:", err);
  }

  try {
    const { scheduleAppointmentReminders } = await import("@/lib/notifications/schedule-reminders");
    const scheduled = await scheduleAppointmentReminders(appointment);
    if (scheduled.scheduled.length) {
      console.log("Scheduled reminders:", scheduled.scheduled.join(", "), appointment.id);
    }
    if (scheduled.skipped.length) {
      console.log("Reminder schedule notes:", scheduled.skipped.join("; "));
    }
  } catch (err) {
    console.error("QStash reminder scheduling failed:", err);
  }

  try {
    const { sendBookingToGoHighLevel } = await import("@/lib/gohighlevel");
    const ghlResult = await sendBookingToGoHighLevel(appointment);
    if (ghlResult.errors.length) {
      console.warn("GoHighLevel partial sync:", ghlResult.errors.join("; "));
    }
  } catch (err) {
    console.error("GoHighLevel sync failed:", err);
  }

  return NextResponse.json({
    success: true,
    message: "Your appointment is confirmed!",
    appointmentId: appointment.id,
  });
}
