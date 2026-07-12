import {
  INTERVIEW_DURATION_MINUTES,
  INTERVIEW_LOCATION,
  INTERVIEW_LOCATION_DETAIL,
  interviewSlotEndDate,
  parseInterviewSlotKey,
} from "./slots";
import type { InterviewCalendarDetails } from "./types";

export type { InterviewCalendarDetails };

const TZ = "America/Los_Angeles";

function eventTimes(details: InterviewCalendarDetails): { start: Date; end: Date } {
  const parsed = parseInterviewSlotKey(details.slotKey);
  if (!parsed) {
    throw new Error("Invalid slot");
  }
  const start = new Date(`${parsed.date}T${parsed.time24}:00`);
  const end = interviewSlotEndDate(parsed.date, parsed.time24);
  return { start, end };
}

function formatGoogleDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function buildDescription(details: InterviewCalendarDetails): string {
  return [
    `Role: ${details.roleTitle}`,
    `Pay: ${details.payDescription}`,
    `Candidate: ${details.fullName}`,
    `Phone: ${details.phone}`,
    `Email: ${details.email}`,
    INTERVIEW_LOCATION_DETAIL,
  ].join("\n");
}

function eventTitle(details: InterviewCalendarDetails): string {
  return `Mobile Dog Salon Interview — ${details.roleTitle}`;
}

export function buildInterviewGoogleCalendarUrl(details: InterviewCalendarDetails): string {
  const { start, end } = eventTimes(details);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: eventTitle(details),
    dates: `${formatGoogleDate(start)}/${formatGoogleDate(end)}`,
    details: buildDescription(details),
    location: INTERVIEW_LOCATION,
    ctz: TZ,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildInterviewOutlookCalendarUrl(details: InterviewCalendarDetails): string {
  const { start, end } = eventTimes(details);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: eventTitle(details),
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: buildDescription(details),
    location: INTERVIEW_LOCATION,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function buildInterviewYahooCalendarUrl(details: InterviewCalendarDetails): string {
  const { start, end } = eventTimes(details);
  const params = new URLSearchParams({
    v: "60",
    title: eventTitle(details),
    st: formatGoogleDate(start),
    et: formatGoogleDate(end),
    desc: buildDescription(details),
    in_loc: INTERVIEW_LOCATION,
  });
  return `https://calendar.yahoo.com/?${params.toString()}`;
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildInterviewIcsBlob(details: InterviewCalendarDetails): Blob {
  const { start, end } = eventTimes(details);
  const summary = escapeIcs(eventTitle(details));
  const description = escapeIcs(buildDescription(details));
  const location = escapeIcs(INTERVIEW_LOCATION);

  const formatLocal = (d: Date) => {
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
  };

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mobile Dog Salon//Interview//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${details.id}@mobiledog-salon.com`,
    `DTSTAMP:${formatGoogleDate(new Date())}`,
    `DTSTART;TZID=${TZ}:${formatLocal(start)}`,
    `DTEND;TZID=${TZ}:${formatLocal(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `DURATION:PT${INTERVIEW_DURATION_MINUTES}M`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Blob([ics], { type: "text/calendar;charset=utf-8" });
}

export function downloadInterviewIcsFile(
  details: InterviewCalendarDetails,
  filename = "mobile-dog-salon-interview.ics"
) {
  const blob = buildInterviewIcsBlob(details);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function bookingToCalendarDetails(booking: {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  roleTitle: string;
  payDescription: string;
  slotKey: string;
}): InterviewCalendarDetails {
  return {
    id: booking.id,
    fullName: booking.fullName,
    email: booking.email,
    phone: booking.phone,
    date: booking.date,
    time: booking.time,
    roleTitle: booking.roleTitle,
    payDescription: booking.payDescription,
    slotKey: booking.slotKey,
  };
}
