import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { isLocalhostRequest } from "@/lib/dev/is-localhost-request";
import { PersistenceNotConfiguredError } from "@/lib/scheduling/persistence";
import { readSchedulingData, writeSchedulingData } from "@/lib/scheduling/store";
import {
  isBookableDate,
  isSlotTaken,
  parseSlotKey,
  slotToISO,
} from "@/lib/scheduling/slots";
import { BOOKING_DURATION_MINUTES } from "@/lib/scheduling/services";
import { hasMinimumAvailabilityForBooking } from "@/lib/scheduling/availability";
import { isAllowedBookingBlockStart, groomerAcceptsBookings } from "@/lib/scheduling/groomers";
import { isGroomerFullyBooked } from "@/lib/scheduling/capacity";
import { sendCalendarInvites } from "@/lib/scheduling/calendar";
import { upsertLead } from "@/lib/leads/store";
import { leadFieldsFromAppointment } from "@/lib/leads/appointment-fields";
import { getAppointmentPets } from "@/lib/booking/pets";
import { getOrCreateHoldOwnerId } from "@/lib/scheduling/hold-owner";
import {
  consumeSlotHold,
  createSlotHold,
  validateSlotHold,
} from "@/lib/scheduling/slot-holds";
import type { Appointment } from "@/lib/scheduling/types";

export async function POST(request: Request) {
  try {
    return await handleBookPost(request);
  } catch (err) {
    console.error("Book API error:", err);
    const message =
      err instanceof PersistenceNotConfiguredError
        ? "Booking is temporarily unavailable. Please call (949) 755-8994."
        : "Could not complete booking. Please try again or call (949) 755-8994.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleBookPost(request: Request) {
  const body = await request.json();

  const {
    slotKey,
    petName,
    petBreed,
    petSize,
    additionalPets,
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
    fromFallback,
  } = body;

  const phoneTrimmed = phone?.trim() ?? "";
  if (!phoneTrimmed) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  const street = String(address ?? "").trim();
  const cityName = String(city ?? "").trim();
  const zipTrimmed = String(zipCode ?? "").trim();

  if (!slotKey || !petSize || !service || !firstName || !lastName || !street || !cityName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!/^\d{5}(-\d{4})?$/.test(zipTrimmed)) {
    return NextResponse.json(
      { error: "Please enter a valid ZIP code." },
      { status: 400 }
    );
  }

  const emailTrimmed = String(email ?? "").trim();
  const bookingEmail =
    emailTrimmed || `${phoneTrimmed.replace(/\D/g, "")}@booking.mobiledog-salon.com`;

  if (smsOptIn && !phoneTrimmed) {
    return NextResponse.json({ error: "Phone number required for SMS opt-in" }, { status: 400 });
  }

  let groomerId, date, time;
  try {
    ({ groomerId, date, time } = parseSlotKey(slotKey));
  } catch {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }

  if (!groomerAcceptsBookings(groomerId)) {
    return NextResponse.json(
      { error: "That groomer is not accepting new bookings" },
      { status: 409 }
    );
  }

  if (!isBookableDate(date)) {
    return NextResponse.json(
      { error: "Same-day appointments are not available. Please choose a future date." },
      { status: 400 }
    );
  }

  if (!isAllowedBookingBlockStart(time)) {
    return NextResponse.json(
      { error: "That time slot is not available. Latest visits start at 7 PM." },
      { status: 400 }
    );
  }

  const data = await readSchedulingData();
  const devBooking = isLocalhostRequest(request);
  const relaxAvailability = devBooking || Boolean(fromFallback);

  if (!relaxAvailability) {
    const dayAvail = data.availability.find(
      (a) => a.groomerId === groomerId && a.date === date
    );
    if (!dayAvail || !hasMinimumAvailabilityForBooking(dayAvail.times, time)) {
      return NextResponse.json({ error: "Groomer is not available at that time" }, { status: 409 });
    }
    if (isGroomerFullyBooked(groomerId, date, data.appointments)) {
      return NextResponse.json(
        { error: "Groomer is fully booked on that day (4 appointments max)" },
        { status: 409 }
      );
    }
  }

  if (isSlotTaken(groomerId, date, time, BOOKING_DURATION_MINUTES, data.appointments)) {
    return NextResponse.json({ error: "That time slot is no longer available" }, { status: 409 });
  }

  const holdOwnerId = await getOrCreateHoldOwnerId();
  if (!devBooking) {
    let holdCheck = await validateSlotHold(holdOwnerId, slotKey);
    if (!holdCheck.ok) {
      const refreshed = await createSlotHold(holdOwnerId, slotKey);
      if (refreshed.ok) {
        holdCheck = await validateSlotHold(holdOwnerId, slotKey);
      }
    }
    if (!holdCheck.ok) {
      return NextResponse.json({ error: holdCheck.error }, { status: 409 });
    }
  }

  const appointment: Appointment = {
    id: randomUUID(),
    groomerId,
    startAt: slotToISO(date, time),
    durationMinutes: BOOKING_DURATION_MINUTES,
    status: "confirmed",
    petName: petName?.trim() ?? "",
    petBreed: petBreed ?? "",
    petSize: petSize ?? "",
    additionalPets: Array.isArray(additionalPets)
      ? additionalPets.filter((pet) => pet?.petSize)
      : undefined,
    service,
    firstName,
    lastName,
    email: bookingEmail,
    phone: phoneTrimmed,
    smsOptIn: Boolean(smsOptIn),
    address: street,
    city: cityName || "Orange County",
    zipCode: zipTrimmed,
    notes: notes ?? "",
    createdAt: new Date().toISOString(),
  };

  data.appointments.push(appointment);
  await writeSchedulingData(data, {
    action: "booking",
    actor: bookingEmail,
    groomerId,
  });

  if (!devBooking) {
    await consumeSlotHold(holdOwnerId, slotKey);
  }

  try {
    await upsertLead({
      funnelStep: "scheduled",
      phone: appointment.phone,
      email: appointment.email,
      firstName: appointment.firstName,
      lastName: appointment.lastName,
      petName: appointment.petName,
      petSize: appointment.petSize,
      pets: getAppointmentPets(appointment),
      service: appointment.service,
      address: appointment.address,
      city: appointment.city,
      zipCode: appointment.zipCode,
      smsOptIn: appointment.smsOptIn,
      discountActive: Boolean(smsOptIn),
      appointmentId: appointment.id,
      scheduledAt: appointment.createdAt,
      ...leadFieldsFromAppointment(appointment),
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
