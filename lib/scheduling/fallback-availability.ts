import {
  BOOKABLE_GROOMER_IDS,
  TIME_SLOT_OPTIONS,
  formatSelfBookingSlotDisplay,
  groomerAcceptsBookings,
  groomerClientDisplayName,
} from "./groomers";
import { addDays, isBookableDate, isPastCalendarDate, preferMelanieOnOverlapSlots } from "./slots";
import { listSelfBookingStarts } from "./availability";
import type { AvailableSlot, GroomerId } from "./types";
export interface FallbackWeekDay {
  date: string;
  weekday: string;
  dayNumber: number;
  monthShort: string;
  isPast: boolean;
  slots: AvailableSlot[];
}

const ACTIVE_GROOMER_IDS = BOOKABLE_GROOMER_IDS;

export function buildFallbackWeekDays(weekStart: string): FallbackWeekDay[] {
  return buildFallbackRangeDays(weekStart, 7);
}

export function buildFallbackRangeDays(
  fromDate: string,
  dayCount: number,
  groomerId?: GroomerId
): FallbackWeekDay[] {
  const count = Math.max(1, Math.min(dayCount, 90));
  const groomerIds = groomerId
    ? groomerAcceptsBookings(groomerId)
      ? [groomerId]
      : []
    : ACTIVE_GROOMER_IDS;
  return Array.from({ length: count }, (_, i) => addDays(fromDate, i)).map((date) => {
    const d = new Date(`${date}T12:00:00`);
    const slots: AvailableSlot[] = [];

    if (isBookableDate(date)) {
      for (const id of groomerIds) {
        const times = [...TIME_SLOT_OPTIONS];
        for (const time of listSelfBookingStarts(times)) {
          slots.push({
            groomerId: id,
            groomerName: groomerClientDisplayName(id),
            date,
            time,
            displayTime: formatSelfBookingSlotDisplay(time),
            slotKey: `${id}|${date}|${time}`,
          });
        }
      }
    }

    return {
      date,
      weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
      dayNumber: d.getDate(),
      monthShort: d.toLocaleDateString("en-US", { month: "short" }),
      isPast: isPastCalendarDate(date),
      slots: preferMelanieOnOverlapSlots(
        slots.sort((a, b) => a.time.localeCompare(b.time))
      ),
    };
  });
}

export function nextWeekStart(weekStart: string): string {
  return addDays(weekStart, 7);
}
