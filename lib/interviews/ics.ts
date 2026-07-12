import {
  INTERVIEW_DURATION_MINUTES,
  INTERVIEW_LOCATION,
  INTERVIEW_LOCATION_DETAIL,
  INTERVIEW_PAY,
  interviewSlotEndDate,
  parseInterviewSlotKey,
} from "./slots";
import type { InterviewBooking } from "./types";

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

function interviewEventTimes(booking: InterviewBooking): { start: Date; end: Date } {
  const parsed = parseInterviewSlotKey(booking.slotKey);
  if (!parsed) {
    throw new Error("Invalid interview slot.");
  }
  const start = new Date(`${parsed.date}T${parsed.time24}:00`);
  const end = interviewSlotEndDate(parsed.date, parsed.time24);
  return { start, end };
}

function buildDescription(booking: InterviewBooking): string {
  return [
    `Role: ${booking.roleTitle}`,
    `Pay: ${booking.payDescription}`,
    `Candidate: ${booking.fullName}`,
    `Phone: ${booking.phone}`,
    `Email: ${booking.email}`,
    INTERVIEW_LOCATION_DETAIL,
  ].join("\n");
}

export function buildInterviewIcsEvent(
  booking: InterviewBooking,
  options?: { attendeeEmail?: string; method?: "REQUEST" | "PUBLISH" }
): string {
  const { start, end } = interviewEventTimes(booking);
  const method = options?.method ?? "REQUEST";
  const summary = escapeIcs(
    `Mobile Dog Salon Interview — ${booking.roleTitle}`
  );
  const description = escapeIcs(buildDescription(booking));
  const location = escapeIcs(`${INTERVIEW_LOCATION}`);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mobile Dog Salon//Interview//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    VTIMEZONE_BLOCK,
    "BEGIN:VEVENT",
    `UID:${booking.id}@mobiledog-salon.com`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART;TZID=${TZ}:${formatIcsPacific(start)}`,
    `DTEND;TZID=${TZ}:${formatIcsPacific(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `ORGANIZER;CN=${escapeIcs(ORGANIZER_NAME)}:mailto:${ORGANIZER_EMAIL}`,
  ];

  if (options?.attendeeEmail) {
    lines.push(
      `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${escapeIcs(booking.fullName)}:mailto:${options.attendeeEmail}`
    );
  }

  lines.push(
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR"
  );

  return lines.join("\r\n");
}

export function interviewDurationLabel(): string {
  return `${INTERVIEW_DURATION_MINUTES} minutes`;
}

export function interviewPayLabel(): string {
  return INTERVIEW_PAY;
}
