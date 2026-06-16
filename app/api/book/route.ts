import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readSchedulingData, writeSchedulingData } from "@/lib/scheduling/store";
import {
  isSlotTaken,
  parseSlotKey,
  slotToISO,
} from "@/lib/scheduling/slots";
import { BOOKING_DURATION_MINUTES } from "@/lib/scheduling/services";
import {
  consumeGroomerAvailability,
  hasConsecutiveAvailability,
} from "@/lib/scheduling/availability";
import { sendCalendarInvites } from "@/lib/scheduling/calendar";
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
    address,
    city,
    notes,
  } = body;

  if (!slotKey || !petName || !service || !firstName || !lastName || !email || !phone || !address || !city) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  let groomerId, date, time;
  try {
    ({ groomerId, date, time } = parseSlotKey(slotKey));
  } catch {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }

  const data = await readSchedulingData();

  const dayAvail = data.availability.find(
    (a) => a.groomerId === groomerId && a.date === date
  );
  if (!dayAvail || !hasConsecutiveAvailability(dayAvail.times, time, BOOKING_DURATION_MINUTES)) {
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
    phone,
    address,
    city,
    notes: notes ?? "",
    createdAt: new Date().toISOString(),
  };

  data.appointments.push(appointment);
  consumeGroomerAvailability(data, groomerId, date, time, BOOKING_DURATION_MINUTES);
  await writeSchedulingData(data);

  try {
    await sendCalendarInvites(appointment);
  } catch (err) {
    console.error("Calendar invite failed:", err);
  }

  return NextResponse.json({
    success: true,
    message: "Your appointment is confirmed!",
    appointmentId: appointment.id,
  });
}
