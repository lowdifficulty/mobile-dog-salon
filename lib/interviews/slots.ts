export const INTERVIEW_ROLE_TITLE = "Mobile Dog Groomer";

export const INTERVIEW_PAY = "$20/hour plus tips";

export const INTERVIEW_DURATION_MINUTES = 20;

export const INTERVIEW_LOCATION = "Orange County, CA";

export const INTERVIEW_LOCATION_DETAIL =
  "Exact meeting location or phone details will be sent before your interview.";

/** Hiring manager calendar — receives ICS invites for each booking */
export const INTERVIEW_MANAGER_EMAIL = "mattlewis06@gmail.com";

/** Tuesday Jul 14 and Thursday Jul 16, 2026 — groomer interview days */
export const INTERVIEW_DATES = ["2026-07-14", "2026-07-16"] as const;

export type InterviewDate = (typeof INTERVIEW_DATES)[number];

/** @deprecated Use INTERVIEW_DATES */
export const INTERVIEW_DATE = INTERVIEW_DATES[0];

const SLOT_TIMES_24H = [
  "09:00",
  "09:20",
  "09:40",
  "10:00",
  "10:20",
  "10:40",
  "11:00",
  "11:20",
  "11:40",
] as const;

export type InterviewSlotTime = (typeof SLOT_TIMES_24H)[number];

export interface InterviewSlot {
  slotKey: string;
  date: string;
  time24: InterviewSlotTime;
  timeLabel: string;
  available: boolean;
}

export interface InterviewDateOption {
  date: string;
  dateLabel: string;
  weekdayLabel: string;
  availableCount: number;
  totalCount: number;
}

export function isInterviewDate(date: string): date is InterviewDate {
  return (INTERVIEW_DATES as readonly string[]).includes(date);
}

export function formatInterviewTimeLabel(time24: string): string {
  const [hourStr, minute] = time24.split(":");
  let hour = Number(hourStr);
  const period = hour >= 12 ? "PM" : "AM";
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return `${hour}:${minute} ${period}`;
}

export function buildInterviewSlotKey(date: string, time24: string): string {
  return `${date}|${time24}`;
}

export function parseInterviewSlotKey(slotKey: string): { date: string; time24: string } | null {
  const match = slotKey.match(/^(\d{4}-\d{2}-\d{2})\|(\d{2}:\d{2})$/);
  if (!match) return null;
  return { date: match[1], time24: match[2] };
}

export function isValidInterviewSlotKey(slotKey: string): boolean {
  const parsed = parseInterviewSlotKey(slotKey);
  if (!parsed || !isInterviewDate(parsed.date)) return false;
  return SLOT_TIMES_24H.includes(parsed.time24 as InterviewSlotTime);
}

export function interviewSlotEndDate(date: string, time24: string): Date {
  const start = new Date(`${date}T${time24}:00`);
  return new Date(start.getTime() + INTERVIEW_DURATION_MINUTES * 60 * 1000);
}

export function formatInterviewDateLong(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  });
}

export function formatInterviewWeekdayLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "America/Los_Angeles",
  });
}

export function formatInterviewDatePickerLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  const weekday = d.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "America/Los_Angeles",
  });
  const monthDay = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
  return `${weekday}, ${monthDay}`;
}

export function listInterviewSlotDefinitions(
  date: string
): Omit<InterviewSlot, "available">[] {
  if (!isInterviewDate(date)) return [];
  return SLOT_TIMES_24H.map((time24) => ({
    slotKey: buildInterviewSlotKey(date, time24),
    date,
    time24,
    timeLabel: formatInterviewTimeLabel(time24),
  }));
}

export function applySlotAvailability(
  slots: Omit<InterviewSlot, "available">[],
  bookedSlotKeys: Set<string>
): InterviewSlot[] {
  return slots.map((slot) => ({
    ...slot,
    available: !bookedSlotKeys.has(slot.slotKey),
  }));
}

export function listInterviewDateOptions(
  bookedSlotKeys: Set<string>
): InterviewDateOption[] {
  return INTERVIEW_DATES.map((date) => {
    const slots = applySlotAvailability(listInterviewSlotDefinitions(date), bookedSlotKeys);
    const availableCount = slots.filter((slot) => slot.available).length;
    return {
      date,
      dateLabel: formatInterviewDateLong(date),
      weekdayLabel: formatInterviewWeekdayLabel(date),
      availableCount,
      totalCount: slots.length,
    };
  });
}

/** Tuesday while it has openings; otherwise Thursday if available. */
export function resolveActiveInterviewDate(
  dateOptions: InterviewDateOption[]
): InterviewDateOption | null {
  const byDate = new Map(dateOptions.map((option) => [option.date, option]));
  const tuesday = byDate.get(INTERVIEW_DATES[0]);
  if (tuesday && tuesday.availableCount > 0) return tuesday;
  const thursday = byDate.get(INTERVIEW_DATES[1]);
  if (thursday && thursday.availableCount > 0) return thursday;
  return null;
}

export function formatInterviewDatesSummary(): string {
  return INTERVIEW_DATES.map((date) => formatInterviewWeekdayLabel(date)).join(" or ");
}
