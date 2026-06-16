import type {
  Appointment,
  AvailabilityDay,
  AvailableSlot,
  GroomerId,
} from "./types";
import { GROOMERS, formatDisplayTime } from "./groomers";
import { serviceDurationMinutes } from "./services";

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
  appointments: Appointment[]
): boolean {
  const start = parseLocalDateTime(date, time);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  return appointments.some((ap) => {
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
  const duration = serviceDurationMinutes(service);
  const slots: AvailableSlot[] = [];

  for (const day of availability) {
    if (day.date !== date) continue;
    if (!ACTIVE_GROOMER_IDS.includes(day.groomerId)) continue;
    for (const time of day.times) {
      if (isSlotTaken(day.groomerId, date, time, duration, appointments)) continue;
      slots.push({
        groomerId: day.groomerId,
        groomerName: GROOMERS[day.groomerId].name,
        date,
        time,
        displayTime: formatDisplayTime(time),
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
    if (!ACTIVE_GROOMER_IDS.includes(day.groomerId)) continue;
    const hasSlot = day.times.some(
      (time) => !isSlotTaken(day.groomerId, day.date, time, serviceDurationMinutes(service), appointments)
    );
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
