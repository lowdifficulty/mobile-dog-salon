export const INTERVIEW_ROLE_TITLE = "Mobile Dog Groomer";

export const INTERVIEW_DURATION_MINUTES = 30;

/** Minimum hours before an interview slot can be booked */
export const INTERVIEW_BOOKING_LEAD_HOURS = 24;

export const INTERVIEW_BOOKING_LEAD_MS =
  INTERVIEW_BOOKING_LEAD_HOURS * 60 * 60 * 1000;

export const INTERVIEW_LOCATION = "Orange County, CA";

export const INTERVIEW_LOCATION_DETAIL =
  "Exact meeting location or phone details will be sent before your interview.";

/** How many calendar weeks of Mon–Thu interview days to offer */
export const INTERVIEW_WEEKS_AHEAD = 4;

const PACIFIC_TZ = "America/Los_Angeles";

const SLOT_TIMES_24H = [
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
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

function pacificYmd(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: PACIFIC_TZ });
}

function pacificWeekdayIndex(ymd: string): number {
  const weekday = new Date(`${ymd}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: PACIFIC_TZ,
  });
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days.indexOf(weekday);
}

/** Upcoming Monday–Thursday dates for the next few weeks (Pacific). */
export function getInterviewDates(referenceDate = new Date()): string[] {
  const dates: string[] = [];
  const startYmd = pacificYmd(referenceDate);
  const base = new Date(`${startYmd}T12:00:00`);

  for (let i = 0; i < INTERVIEW_WEEKS_AHEAD * 7; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const ymd = pacificYmd(d);
    const weekday = pacificWeekdayIndex(ymd);
    if (weekday >= 1 && weekday <= 4) {
      dates.push(ymd);
    }
  }

  return dates;
}

/** @deprecated Use getInterviewDates() */
export const INTERVIEW_DATES = getInterviewDates();

export type InterviewDate = string;

/** @deprecated Use getInterviewDates() */
export const INTERVIEW_DATE = INTERVIEW_DATES[0] ?? "";

export function isInterviewDate(date: string): boolean {
  return getInterviewDates().includes(date);
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

function pacificPartsFromDate(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/** Pacific wall-clock start instant for an interview slot. */
export function interviewSlotStartAt(date: string, time24: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time24.split(":").map(Number);
  const target = { year, month, day, hour, minute };

  function comparePacific(ms: number): number {
    const parts = pacificPartsFromDate(new Date(ms));
    if (parts.year !== target.year) return parts.year - target.year;
    if (parts.month !== target.month) return parts.month - target.month;
    if (parts.day !== target.day) return parts.day - target.day;
    if (parts.hour !== target.hour) return parts.hour - target.hour;
    return parts.minute - target.minute;
  }

  let low = Date.UTC(year, month - 1, day - 1);
  let high = Date.UTC(year, month - 1, day + 1, 23, 59);

  while (high - low > 60_000) {
    const mid = Math.floor((low + high) / 2);
    const cmp = comparePacific(mid);
    if (cmp < 0) low = mid;
    else high = mid;
  }

  for (let ms = low; ms <= high; ms += 60_000) {
    const parts = pacificPartsFromDate(new Date(ms));
    if (
      parts.year === target.year &&
      parts.month === target.month &&
      parts.day === target.day &&
      parts.hour === target.hour &&
      parts.minute === target.minute
    ) {
      return new Date(ms);
    }
  }

  return new Date(Date.UTC(year, month - 1, day, hour + 7, minute));
}

export function isInterviewSlotBookable(
  date: string,
  time24: string,
  referenceDate = new Date()
): boolean {
  const start = interviewSlotStartAt(date, time24);
  return start.getTime() - referenceDate.getTime() >= INTERVIEW_BOOKING_LEAD_MS;
}

export function interviewSlotEndDate(date: string, time24: string): Date {
  const start = interviewSlotStartAt(date, time24);
  return new Date(start.getTime() + INTERVIEW_DURATION_MINUTES * 60 * 1000);
}

export function formatInterviewDateLong(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: PACIFIC_TZ,
  });
}

export function formatInterviewWeekdayLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: PACIFIC_TZ,
  });
}

export function formatInterviewDatePickerLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  const weekday = d.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: PACIFIC_TZ,
  });
  const monthDay = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: PACIFIC_TZ,
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
  bookedSlotKeys: Set<string>,
  referenceDate = new Date()
): InterviewSlot[] {
  return slots.map((slot) => ({
    ...slot,
    available:
      !bookedSlotKeys.has(slot.slotKey) &&
      isInterviewSlotBookable(slot.date, slot.time24, referenceDate),
  }));
}

export function listInterviewDateOptions(
  bookedSlotKeys: Set<string>
): InterviewDateOption[] {
  return getInterviewDates().map((date) => {
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

/** First Mon–Thu date that still has an open slot. */
export function resolveActiveInterviewDate(
  dateOptions: InterviewDateOption[]
): InterviewDateOption | null {
  return dateOptions.find((option) => option.availableCount > 0) ?? null;
}

export function formatInterviewDatesSummary(): string {
  const weekdays = new Set(
    getInterviewDates().map((date) => formatInterviewWeekdayLabel(date))
  );
  return [...weekdays].join(", ");
}

export function interviewAvailabilityHoursLabel(): string {
  return "11 AM–2 PM";
}
