import { GROOMERS, TIME_SLOT_OPTIONS, formatSelfBookingSlotDisplay, groomerClientDisplayName } from "./groomers";import { addDays, isBookableDate, isPastCalendarDate } from "./slots";
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

const ACTIVE_GROOMER_IDS = Object.keys(GROOMERS) as GroomerId[];

export function buildFallbackWeekDays(weekStart: string): FallbackWeekDay[] {
  return buildFallbackRangeDays(weekStart, 7);
}

export function buildFallbackRangeDays(
  fromDate: string,
  dayCount: number
): FallbackWeekDay[] {
  const count = Math.max(1, Math.min(dayCount, 90));
  return Array.from({ length: count }, (_, i) => addDays(fromDate, i)).map((date) => {
    const d = new Date(`${date}T12:00:00`);
    const slots: AvailableSlot[] = [];

    if (isBookableDate(date)) {
      for (const groomerId of ACTIVE_GROOMER_IDS) {
        const times = [...TIME_SLOT_OPTIONS];
        for (const time of listSelfBookingStarts(times)) {
          slots.push({
            groomerId,
            groomerName: groomerClientDisplayName(groomerId),
            date,
            time,
            displayTime: formatSelfBookingSlotDisplay(time),
            slotKey: `${groomerId}|${date}|${time}`,
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
      slots: slots.sort((a, b) => a.time.localeCompare(b.time)),
    };
  });
}

export function nextWeekStart(weekStart: string): string {
  return addDays(weekStart, 7);
}
