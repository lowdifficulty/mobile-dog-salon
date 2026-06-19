import "server-only";
import { Resend } from "resend";
import type { Appointment } from "./types";
import { formatAppointmentAddress } from "./address";
import { CALENDAR_NOTIFY_EMAILS, GROOMERS } from "./groomers";
import { getServiceLabel } from "@/lib/pricing";

const TZ = "America/Los_Angeles";
const ORGANIZER_EMAIL =
  process.env.BOOKING_ORGANIZER_EMAIL ?? "bookings@mobiledog-salon.com";
const ORGANIZER_NAME = "Mobile Dog Salon";

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatIcsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/** YYYYMMDDTHHmmss in Pacific Time for Outlook TZID fields. */
function formatIcsPacific(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  let hour = get("hour");
  if (hour === "24") hour = "00";

  return `${get("year")}${get("month")}${get("day")}T${hour}${get("minute")}${get("second")}`;
}

const VTIMEZONE_BLOCK = [
  "BEGIN:VTIMEZONE",
  "TZID:America/Los_Angeles",
  "X-LIC-LOCATION:America/Los_Angeles",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0800",
  "TZOFFSETTO:-0700",
  "TZNAME:PDT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0700",
  "TZOFFSETTO:-0800",
  "TZNAME:PST",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
].join("\r\n");

export function buildIcsEvent(appointment: Appointment): string {
  const start = new Date(appointment.startAt);
  const end = new Date(start.getTime() + appointment.durationMinutes * 60 * 1000);
  const groomer = GROOMERS[appointment.groomerId];
  const serviceLabel = getServiceLabel(appointment.service);

  const summary = escapeIcs(
    `Mobile Dog Salon — ${appointment.petName} (${serviceLabel})`
  );
  const description = escapeIcs(
    `Groomer: ${groomer.name}\nDuration: 2 hours\nPet: ${appointment.petName} (${appointment.petBreed}, ${appointment.petSize})\nService: ${serviceLabel}\nClient: ${appointment.firstName} ${appointment.lastName}\nPhone: ${appointment.phone}\nEmail: ${appointment.email}\nAddress: ${formatAppointmentAddress(appointment)}\nNotes: ${appointment.notes || "—"}`
  );
  const location = escapeIcs(`${formatAppointmentAddress(appointment)}, CA`);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mobile Dog Salon//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    VTIMEZONE_BLOCK,
    "BEGIN:VEVENT",
    `UID:${appointment.id}@mobiledog-salon.com`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART;TZID=${TZ}:${formatIcsPacific(start)}`,
    `DTEND;TZID=${TZ}:${formatIcsPacific(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `ORGANIZER;CN=${escapeIcs(ORGANIZER_NAME)}:mailto:${ORGANIZER_EMAIL}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${escapeIcs(groomer.name)}:mailto:${groomer.calendarEmail}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function calendarRecipients(appointment: Appointment): string[] {
  const groomer = GROOMERS[appointment.groomerId];
  return Array.from(
    new Set([groomer.calendarEmail, groomer.email, ...CALENDAR_NOTIFY_EMAILS])
  );
}

export async function sendCalendarInvites(appointment: Appointment): Promise<boolean> {
  const ics = buildIcsEvent(appointment);
  const groomer = GROOMERS[appointment.groomerId];
  const serviceLabel = getServiceLabel(appointment.service);
  const recipients = calendarRecipients(appointment);

  const startLocal = new Date(appointment.startAt).toLocaleString("en-US", {
    timeZone: TZ,
    dateStyle: "medium",
    timeStyle: "short",
  });
  const endLocal = new Date(
    new Date(appointment.startAt).getTime() + appointment.durationMinutes * 60 * 1000
  ).toLocaleString("en-US", { timeZone: TZ, timeStyle: "short" });

  const subject = `Appointment: ${appointment.petName} with ${groomer.name} — ${serviceLabel} (2 hrs)`;
  const html = `
    <p><strong>New Mobile Dog Salon appointment (2 hours)</strong></p>
    <p><strong>Groomer:</strong> ${groomer.name}<br/>
    <strong>When:</strong> ${startLocal} – ${endLocal} Pacific<br/>
    <strong>Pet:</strong> ${appointment.petName} (${appointment.petBreed})<br/>
    <strong>Service:</strong> ${serviceLabel}<br/>
    <strong>Client:</strong> ${appointment.firstName} ${appointment.lastName}<br/>
    <strong>Phone:</strong> ${appointment.phone}<br/>
    <strong>Email:</strong> ${appointment.email}<br/>
    <strong>Address:</strong> ${formatAppointmentAddress(appointment)}</p>
    <p>Open the attached calendar invite to add this 2-hour appointment to Outlook.</p>
  `;

  if (!process.env.RESEND_API_KEY) {
    console.log("Calendar ICS (RESEND_API_KEY not set):\n", ics);
    console.log("Notify:", recipients.join(", "));
    return false;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.BOOKING_EMAIL_FROM ?? `Mobile Dog Salon <${ORGANIZER_EMAIL}>`;

  await resend.emails.send({
    from,
    to: recipients,
    subject,
    html,
    attachments: [
      {
        filename: "appointment.ics",
        content: Buffer.from(ics).toString("base64"),
        contentType: "text/calendar; method=REQUEST",
      },
    ],
  });

  return true;
}
