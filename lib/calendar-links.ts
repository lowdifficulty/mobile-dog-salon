import { formatAppointmentAddress } from "@/lib/scheduling/address";
import { getServiceLabel } from "@/lib/pricing";
import { BOOKING_DURATION_MINUTES } from "@/lib/scheduling/services";

export interface CalendarEventDetails {
  petName: string;
  petBreed?: string;
  petSize?: string;
  service: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zipCode: string;
  groomerName: string;
  preferredDate: string;
  preferredTime: string;
  slotKey: string;
  appointmentId?: string;
}

const TZ = "America/Los_Angeles";

function parseDisplayTimeTo24h(displayTime: string): string {
  const match = displayTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "09:00";
  let hour = Number(match[1]);
  const minute = match[2];
  const period = match[3].toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function eventTimes(details: CalendarEventDetails): { start: Date; end: Date } {
  const time24 = details.slotKey.split("|")[2] ?? parseDisplayTimeTo24h(details.preferredTime);
  const start = new Date(`${details.preferredDate}T${time24}:00`);
  const end = new Date(start.getTime() + BOOKING_DURATION_MINUTES * 60 * 1000);
  return { start, end };
}

function formatGoogleDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function buildDescription(details: CalendarEventDetails): string {
  const serviceLabel = getServiceLabel(details.service);
  const address = formatAppointmentAddress({
    address: details.address,
    city: details.city,
    zipCode: details.zipCode,
  });
  return [
    `Groomer: ${details.groomerName}`,
    `Pet: ${details.petName}`,
    `Service: ${serviceLabel}`,
    `Client: ${details.firstName} ${details.lastName}`,
    `Phone: ${details.phone}`,
    `Email: ${details.email}`,
    `Address: ${address}`,
  ].join("\n");
}

export function buildGoogleCalendarUrl(details: CalendarEventDetails): string {
  const { start, end } = eventTimes(details);
  const serviceLabel = getServiceLabel(details.service);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Mobile Dog Salon — ${details.petName} (${serviceLabel})`,
    dates: `${formatGoogleDate(start)}/${formatGoogleDate(end)}`,
    details: buildDescription(details),
    location: `${formatAppointmentAddress(details)}, CA`,
    ctz: TZ,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookCalendarUrl(details: CalendarEventDetails): string {
  const { start, end } = eventTimes(details);
  const serviceLabel = getServiceLabel(details.service);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: `Mobile Dog Salon — ${details.petName} (${serviceLabel})`,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: buildDescription(details),
    location: `${formatAppointmentAddress(details)}, CA`,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function buildYahooCalendarUrl(details: CalendarEventDetails): string {
  const { start, end } = eventTimes(details);
  const serviceLabel = getServiceLabel(details.service);
  const params = new URLSearchParams({
    v: "60",
    title: `Mobile Dog Salon — ${details.petName} (${serviceLabel})`,
    st: formatGoogleDate(start),
    et: formatGoogleDate(end),
    desc: buildDescription(details),
    in_loc: `${formatAppointmentAddress(details)}, CA`,
  });
  return `https://calendar.yahoo.com/?${params.toString()}`;
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildIcsBlob(details: CalendarEventDetails): Blob {
  const { start, end } = eventTimes(details);
  const serviceLabel = getServiceLabel(details.service);
  const uid = details.appointmentId ?? `mds-${Date.now()}`;
  const summary = escapeIcs(`Mobile Dog Salon — ${details.petName} (${serviceLabel})`);
  const description = escapeIcs(buildDescription(details));
  const location = escapeIcs(`${formatAppointmentAddress(details)}, CA`);

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
    "PRODID:-//Mobile Dog Salon//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}@mobiledog-salon.com`,
    `DTSTAMP:${formatGoogleDate(new Date())}`,
    `DTSTART;TZID=${TZ}:${formatLocal(start)}`,
    `DTEND;TZID=${TZ}:${formatLocal(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Blob([ics], { type: "text/calendar;charset=utf-8" });
}

export function downloadIcsFile(details: CalendarEventDetails, filename = "mobile-dog-salon-appointment.ics") {
  const blob = buildIcsBlob(details);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
