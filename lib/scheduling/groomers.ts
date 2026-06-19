import type { GroomerId } from "./types";

export const GROOMERS: Record<
  GroomerId,
  { id: GroomerId; name: string; email: string; calendarEmail: string }
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
export const WORK_END_HOUR = 20; // last appointment start at 8 PM

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

/** 2-hour appointment block start times (groomer + customer calendar). */
export const BOOKING_BLOCK_STARTS = [
  "08:00",
  "10:00",
  "12:00",
  "14:00",
  "16:00",
  "18:00",
  "20:00",
] as const;

export function formatBookingBlockDisplay(startTime24: string): string {
  const [h, m] = startTime24.split(":").map(Number);
  const endMinutes = h * 60 + (m ?? 0) + 120;
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  const endTime24 = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  return `${formatDisplayTime(startTime24)} – ${formatDisplayTime(endTime24)}`;
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

export function groomerIdFromEmail(email: string): GroomerId | null {
  const normalized = email.trim().toLowerCase();
  for (const groomer of Object.values(GROOMERS)) {
    if (groomer.email.toLowerCase() === normalized) {
      return groomer.id;
    }
  }
  return null;
}
