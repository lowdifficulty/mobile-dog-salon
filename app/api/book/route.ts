import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { isLocalhostDevWithoutProductionData } from "@/lib/dev/is-localhost-request";
import { PersistenceNotConfiguredError } from "@/lib/scheduling/persistence";
import { readSchedulingData, writeSchedulingData } from "@/lib/scheduling/store";
import { getCustomerAvailableSlotsForDate } from "@/lib/scheduling/customer-availability";
import {
  isBookableDate,
  isCustomerBookableDateForGroomer,
  isSlotTaken,
  isVanSlotTaken,
  parseSlotKey,
  slotToISO,
} from "@/lib/scheduling/slots";
import { hasMinimumAvailabilityForBooking } from "@/lib/scheduling/availability";
import { isAllowedBookingBlockStart, groomerAcceptsBookings, bookingDurationMinutesForGroomer } from "@/lib/scheduling/groomers";
import { getOrCreateHoldOwnerId } from "@/lib/scheduling/hold-owner";
import {
  consumeSlotHold,
  createSlotHold,
  validateSlotHold,
} from "@/lib/scheduling/slot-holds";
import { vanForGroomer } from "@/lib/scheduling/vans";
import { isValidCustomerEmail, resolveBookingEmail } from "@/lib/booking/customer-email";
import {
  existingAppointmentShortCodes,
  withAppointmentShortCode,
} from "@/lib/scheduling/appointment-short-link";
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
  if (emailTrimmed && !isValidCustomerEmail(emailTrimmed)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  const bookingEmail = resolveBookingEmail(phoneTrimmed, emailTrimmed);

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

  if (!isCustomerBookableDateForGroomer(groomerId, date)) {
    return NextResponse.json(
      { error: "That date is outside the booking window for this groomer. Please choose a nearer date." },
      { status: 400 }
    );
  }

  if (!isAllowedBookingBlockStart(time, groomerId)) {
    return NextResponse.json(
      { error: "That time slot is not available." },
      { status: 400 }
    );
  }

  const visitDuration = bookingDurationMinutesForGroomer(groomerId);

  const data = await readSchedulingData();
  const devBooking = isLocalhostDevWithoutProductionData(request);
  const relaxAvailability = devBooking || Boolean(fromFallback);

  if (!relaxAvailability) {
    const publicSlots = getCustomerAvailableSlotsForDate(
      date,
      data,
      service
    );
    if (!publicSlots.some((slot) => slot.slotKey === slotKey)) {
      return NextResponse.json(
        { error: "That time slot is not available. Please choose another time." },
        { status: 409 }
      );
    }
  }

  if (!relaxAvailability) {
    const dayAvail = data.availability.find(
      (a) => a.groomerId === groomerId && a.date === date
    );
    if (!dayAvail || !hasMinimumAvailabilityForBooking(dayAvail.times, time, visitDuration)) {
      return NextResponse.json({ error: "Groomer is not available at that time" }, { status: 409 });
    }
  }

  if (isSlotTaken(groomerId, date, time, visitDuration, data.appointments)) {
    return NextResponse.json({ error: "That time slot is no longer available" }, { status: 409 });
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
    return NextResponse.json(
      { error: "That van is already booked at that time." },
      { status: 409 }
    );
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

  const appointment: Appointment = withAppointmentShortCode(
    {
      id: randomUUID(),
      groomerId,
      van: vanForGroomer(groomerId),
      startAt: slotToISO(date, time),
      durationMinutes: visitDuration,
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
    },
    existingAppointmentShortCodes(data.appointments)
  );

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
    const { runBookingFollowUp } = await import("@/lib/scheduling/booking-follow-up");
    await runBookingFollowUp(appointment, "booking");
  } catch (err) {
    console.error("Booking follow-up failed:", err);
  }

  return NextResponse.json({
    success: true,
    message: "Your appointment is confirmed!",
    appointmentId: appointment.id,
  });
}
