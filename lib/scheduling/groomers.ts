import type { GroomerId } from "./types";
import { BOOKING_DURATION_MINUTES } from "./services";

export const GROOMERS: Record<
  GroomerId,
  {
    id: GroomerId;
    name: string;
    /** Shown on the public booking calendar only; staff CRM keeps `name`. */
    clientName?: string;
    email: string;
    calendarEmail: string;
  }
> = {
  melanie: {
    id: "melanie",
    name: "Melanie",
    email: "melanie@mobiledog-salon.com",
    calendarEmail: "melanie@mobiledog-salon.com",
  },
  diamond: {
    id: "diamond",
    name: "Diamond",
    clientName: "Sarah",
    email: "diamond@mobiledog-salon.com",
    calendarEmail: "diamond@mobiledog-salon.com",
  },
};

export const CALENDAR_NOTIFY_EMAILS = [
  "melanie@mobiledog-salon.com",
  "team@mobiledog-salon.com",
];

export const ADMIN_EMAIL = "mattlewis06@gmail.com";

export const WORK_START_HOUR = 8;
/** Last 3-hour visit starts at 7 PM and ends at 10 PM. */
export const WORK_END_HOUR = 21;

export const TIME_SLOT_OPTIONS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
] as const;

/** 3-hour availability blocks groomers toggle on their calendar. */
export const BOOKING_BLOCK_STARTS = [
  "08:00",
  "11:00",
  "14:00",
  "17:00",
  "19:00",
] as const;

export function isAllowedBookingBlockStart(time: string): boolean {
  return (BOOKING_BLOCK_STARTS as readonly string[]).includes(time);
}

function formatTimeRangeDisplay(startTime24: string, durationMinutes: number): string {
  const [h, m] = startTime24.split(":").map(Number);
  const endMinutes = h * 60 + (m ?? 0) + durationMinutes;
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  const endTime24 = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  return `${formatDisplayTime(startTime24)} – ${formatDisplayTime(endTime24)}`;
}

/** Staff / groomer views — full appointment length. */
export function formatBookingBlockDisplay(startTime24: string): string {
  return formatTimeRangeDisplay(startTime24, BOOKING_DURATION_MINUTES);
}

/** Customer self-booking — 3-hour calendar slots. */
export function formatSelfBookingSlotDisplay(startTime24: string): string {
  return formatTimeRangeDisplay(startTime24, BOOKING_DURATION_MINUTES);
}

export function formatDisplayTime(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function groomerName(id: GroomerId): string {
  return GROOMERS[id].name;
}

/** Client-facing booking calendar and confirmation copy. */
export function groomerClientDisplayName(id: GroomerId): string {
  const groomer = GROOMERS[id];
  return groomer.clientName ?? groomer.name;
}

export function groomerIdFromEmail(email: string): GroomerId | null {
  const normalized = email.trim().toLowerCase();
  for (const groomer of Object.values(GROOMERS)) {
    if (groomer.email.toLowerCase() === normalized) {
      return groomer.id;
    }
  }
  return null;
}
