import { GROOMERS, TIME_SLOT_OPTIONS, formatBookingBlockDisplay } from "./groomers";
import { addDays, getWeekDates, isBookableDate } from "./slots";
import { listBookingBlockStarts } from "./availability";
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
  return getWeekDates(weekStart).map((date) => {
    const d = new Date(`${date}T12:00:00`);
    const slots: AvailableSlot[] = [];

    if (isBookableDate(date)) {
      for (const groomerId of ACTIVE_GROOMER_IDS) {
        const times = [...TIME_SLOT_OPTIONS];
        for (const time of listBookingBlockStarts(times)) {
          slots.push({
            groomerId,
            groomerName: GROOMERS[groomerId].name,
            date,
            time,
            displayTime: formatBookingBlockDisplay(time),
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
      isPast: !isBookableDate(date),
      slots: slots.sort((a, b) => a.time.localeCompare(b.time)),
    };
  });
}

export function nextWeekStart(weekStart: string): string {
  return addDays(weekStart, 7);
}
