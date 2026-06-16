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
    calendarEmail: "melanie@mobiledog-salon.com",
  },
};

export const CALENDAR_NOTIFY_EMAILS = [
  "melanie@mobiledog-salon.com",
  "team@mobiledog-salon.com",
];

export const ADMIN_EMAIL = "mattlewis06@gmail.com";

export const WORK_START_HOUR = 8;
export const WORK_END_HOUR = 16; // last appointment start at 4 PM

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
] as const;

export function formatDisplayTime(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function groomerName(id: GroomerId): string {
  return GROOMERS[id].name;
}
