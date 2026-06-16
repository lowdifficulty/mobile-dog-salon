import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readSchedulingData, writeSchedulingData } from "@/lib/scheduling/store";
import {
  isSlotTaken,
  parseSlotKey,
  slotToISO,
} from "@/lib/scheduling/slots";
import { serviceDurationMinutes } from "@/lib/scheduling/services";
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

  const durationMinutes = serviceDurationMinutes(service);
  const data = await readSchedulingData();

  if (isSlotTaken(groomerId, date, time, durationMinutes, data.appointments)) {
    return NextResponse.json({ error: "That time slot is no longer available" }, { status: 409 });
  }

  const dayAvail = data.availability.find(
    (a) => a.groomerId === groomerId && a.date === date
  );
  if (!dayAvail?.times.includes(time)) {
    return NextResponse.json({ error: "Groomer is not available at that time" }, { status: 409 });
  }

  const appointment: Appointment = {
    id: randomUUID(),
    groomerId,
    startAt: slotToISO(date, time),
    durationMinutes,
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
