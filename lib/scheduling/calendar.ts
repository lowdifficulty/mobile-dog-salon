import "server-only";
import { Resend } from "resend";
import type { Appointment } from "./types";
import { CALENDAR_NOTIFY_EMAILS, GROOMERS } from "./groomers";
import { SERVICE_OPTIONS } from "@/lib/constants";

function formatIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildIcsEvent(appointment: Appointment): string {
  const start = new Date(appointment.startAt);
  const end = new Date(start.getTime() + appointment.durationMinutes * 60 * 1000);
  const groomer = GROOMERS[appointment.groomerId].name;
  const serviceLabel =
    SERVICE_OPTIONS.find((s) => s.value === appointment.service)?.label ?? appointment.service;

  const summary = escapeIcs(
    `Mobile Dog Salon — ${appointment.petName} (${serviceLabel})`
  );
  const description = escapeIcs(
    `Groomer: ${groomer}\nPet: ${appointment.petName} (${appointment.petBreed}, ${appointment.petSize})\nService: ${serviceLabel}\nClient: ${appointment.firstName} ${appointment.lastName}\nPhone: ${appointment.phone}\nEmail: ${appointment.email}\nAddress: ${appointment.address}, ${appointment.city}\nNotes: ${appointment.notes || "—"}`
  );
  const location = escapeIcs(`${appointment.address}, ${appointment.city}, CA`);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mobile Dog Salon//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${appointment.id}@mobiledog-salon.com`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function sendCalendarInvites(appointment: Appointment): Promise<boolean> {
  const ics = buildIcsEvent(appointment);
  const groomer = GROOMERS[appointment.groomerId].name;
  const serviceLabel =
    SERVICE_OPTIONS.find((s) => s.value === appointment.service)?.label ?? appointment.service;

  const subject = `New booking: ${appointment.petName} with ${groomer} — ${serviceLabel}`;
  const html = `
    <p><strong>New Mobile Dog Salon appointment</strong></p>
    <p><strong>Groomer:</strong> ${groomer}<br/>
    <strong>When:</strong> ${new Date(appointment.startAt).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}<br/>
    <strong>Pet:</strong> ${appointment.petName} (${appointment.petBreed})<br/>
    <strong>Service:</strong> ${serviceLabel}<br/>
    <strong>Client:</strong> ${appointment.firstName} ${appointment.lastName}<br/>
    <strong>Phone:</strong> ${appointment.phone}<br/>
    <strong>Email:</strong> ${appointment.email}<br/>
    <strong>Address:</strong> ${appointment.address}, ${appointment.city}</p>
    <p>Calendar invite attached — add to your calendar from the .ics file if needed.</p>
  `;

  if (!process.env.RESEND_API_KEY) {
    console.log("Calendar ICS (RESEND_API_KEY not set):\n", ics);
    console.log("Notify:", CALENDAR_NOTIFY_EMAILS.join(", "));
    return false;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.BOOKING_EMAIL_FROM ?? "Mobile Dog Salon <bookings@mobiledog-salon.com>";

  await resend.emails.send({
    from,
    to: CALENDAR_NOTIFY_EMAILS,
    subject,
    html,
    attachments: [
      {
        filename: "appointment.ics",
        content: Buffer.from(ics).toString("base64"),
      },
    ],
  });

  return true;
}
