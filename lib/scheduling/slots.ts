import type {
  Appointment,
  AvailabilityDay,
  AvailableSlot,
} from "./types";
import type { GroomerId } from "./types";
import { GROOMERS, formatBookingBlockDisplay, groomerClientDisplayName } from "./groomers";
import { BOOKING_DURATION_MINUTES } from "./services";
import { listBookingBlockStarts } from "./availability";

const ACTIVE_GROOMER_IDS = Object.keys(GROOMERS) as GroomerId[];

function parseLocalDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

function overlaps(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA < endB && endA > startB;
}

export function isSlotTaken(
  groomerId: GroomerId,
  date: string,
  time: string,
  durationMinutes: number,
  appointments: Appointment[],
  excludeAppointmentId?: string
): boolean {
  const start = parseLocalDateTime(date, time);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  return appointments.some((ap) => {
    if (ap.id === excludeAppointmentId) return false;
    if (ap.groomerId !== groomerId || ap.status === "cancelled") return false;
    const apStart = new Date(ap.startAt);
    const apEnd = new Date(apStart.getTime() + ap.durationMinutes * 60 * 1000);
    return overlaps(start, end, apStart, apEnd);
  });
}

export function getAvailableSlotsForDate(
  date: string,
  availability: AvailabilityDay[],
  appointments: Appointment[],
  service: string
): AvailableSlot[] {
  if (!isBookableDate(date)) return [];

  const duration = BOOKING_DURATION_MINUTES;
  const slots: AvailableSlot[] = [];

  for (const day of availability) {
    if (day.date !== date) continue;
    if (!ACTIVE_GROOMER_IDS.includes(day.groomerId)) continue;

    const blockStarts = listBookingBlockStarts(day.times, duration, (time) =>
      isSlotTaken(day.groomerId, date, time, duration, appointments)
    );

    for (const time of blockStarts) {
      slots.push({
        groomerId: day.groomerId,
        groomerName: groomerClientDisplayName(day.groomerId),
        date,
        time,
        displayTime: formatBookingBlockDisplay(time),
        slotKey: `${day.groomerId}|${date}|${time}`,
      });
    }
  }

  return slots.sort((a, b) => a.time.localeCompare(b.time));
}

export function getDatesWithAvailability(
  availability: AvailabilityDay[],
  appointments: Appointment[],
  service: string,
  fromDate: string,
  toDate: string
): string[] {
  const dates = new Set<string>();
  for (const day of availability) {
    if (day.date < fromDate || day.date > toDate) continue;
    if (!isBookableDate(day.date)) continue;
    if (!ACTIVE_GROOMER_IDS.includes(day.groomerId)) continue;
    const hasSlot = listBookingBlockStarts(
      day.times,
      BOOKING_DURATION_MINUTES,
      (time) =>
        isSlotTaken(day.groomerId, day.date, time, BOOKING_DURATION_MINUTES, appointments)
    ).length > 0;
    if (hasSlot) dates.add(day.date);
  }
  return [...dates].sort();
}

export function parseSlotKey(slotKey: string): {
  groomerId: GroomerId;
  date: string;
  time: string;
} {
  const [groomerId, date, time] = slotKey.split("|");
  if (!groomerId || !date || !time) {
    throw new Error("Invalid slot key");
  }
  return { groomerId: groomerId as GroomerId, date, time };
}

/** Pacific Time ISO string for Orange County appointments */
export function slotToISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00-07:00`).toISOString();
}

const PACIFIC_TZ = "America/Los_Angeles";

/** Today's date in Orange County (YYYY-MM-DD). */
export function getTodayPacificDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: PACIFIC_TZ });
}

/** Customers must book at least one day ahead (no same-day appointments). */
export function isBookableDate(date: string): boolean {
  return date > getTodayPacificDate();
}

/** Today or earlier in Pacific time — not shown as open on calendars. */
export function isPastCalendarDate(date: string): boolean {
  return date <= getTodayPacificDate();
}

/** Parse appointment startAt back to Pacific date + HH:mm. */
export function parseSlotFromIso(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-CA", { timeZone: PACIFIC_TZ });
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return { date, time: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}` };
}

export function monthDateRange(monthOffset = 0): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function upcomingMonthDates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + 45);

  const d = new Date(today);
  while (d <= end) {
    const day = d.getDay();
    if (day >= 1 && day <= 5) {
      dates.push(d.toISOString().slice(0, 10));
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export function formatDateISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Sunday-start week containing the given date (YYYY-MM-DD). */
export function getWeekStart(dateStr?: string): string {
  const base = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
  base.setHours(12, 0, 0, 0);
  base.setDate(base.getDate() - base.getDay());
  return formatDateISO(base);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return formatDateISO(d);
}

export function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export interface WeekDayAvailability {
  date: string;
  weekday: string;
  dayNumber: number;
  monthShort: string;
  isPast: boolean;
  slots: AvailableSlot[];
}

export function getWeekAvailability(
  weekStart: string,
  availability: AvailabilityDay[],
  appointments: Appointment[],
  service: string
): WeekDayAvailability[] {
  return getRangeAvailability(weekStart, 7, availability, appointments, service);
}

export function getRangeAvailability(
  fromDate: string,
  dayCount: number,
  availability: AvailabilityDay[],
  appointments: Appointment[],
  service: string
): WeekDayAvailability[] {
  const count = Math.max(1, Math.min(dayCount, 90));
  return Array.from({ length: count }, (_, i) => addDays(fromDate, i)).map((date) => {
    const d = new Date(`${date}T12:00:00`);
    const slots = getAvailableSlotsForDate(
      date,
      availability,
      appointments,
      service
    );
    return {
      date,
      weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
      dayNumber: d.getDate(),
      monthShort: d.toLocaleDateString("en-US", { month: "short" }),
      isPast: isPastCalendarDate(date),
      slots,
    };
  });
}
