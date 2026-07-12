/** Tuesday, July 14, 2026 — groomer interview day */
export const INTERVIEW_DATE = "2026-07-14";

export const INTERVIEW_ROLE_TITLE = "Mobile Dog Groomer";

export const INTERVIEW_PAY = "$20/hour plus tips";

export const INTERVIEW_DURATION_MINUTES = 20;

export const INTERVIEW_LOCATION = "Orange County, CA";

export const INTERVIEW_LOCATION_DETAIL =
  "Exact meeting location or phone details will be sent before your interview.";

/** Hiring manager calendar — receives ICS invites for each booking */
export const INTERVIEW_MANAGER_EMAIL = "mattlewis06@gmail.com";

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
  if (!parsed || parsed.date !== INTERVIEW_DATE) return false;
  return SLOT_TIMES_24H.includes(parsed.time24 as InterviewSlotTime);
}

export function interviewSlotStartIso(date: string, time24: string): string {
  return `${date}T${time24}:00`;
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

export function listInterviewSlotDefinitions(): Omit<InterviewSlot, "available">[] {
  return SLOT_TIMES_24H.map((time24) => ({
    slotKey: buildInterviewSlotKey(INTERVIEW_DATE, time24),
    date: INTERVIEW_DATE,
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
