import { GROOMERS, TIME_SLOT_OPTIONS, formatDisplayTime } from "./groomers";
import { addDays, formatDateISO, getWeekDates } from "./slots";
import { hasConsecutiveAvailability } from "./availability";
import { BOOKING_DURATION_MINUTES } from "./services";
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
  const today = formatDateISO(new Date());

  return getWeekDates(weekStart).map((date) => {
    const d = new Date(`${date}T12:00:00`);
    const slots: AvailableSlot[] = [];

    if (date >= today) {
      for (const groomerId of ACTIVE_GROOMER_IDS) {
        const times = [...TIME_SLOT_OPTIONS];
        for (const time of times) {
          if (!hasConsecutiveAvailability(times, time, BOOKING_DURATION_MINUTES)) {
            continue;
          }
          slots.push({
            groomerId,
            groomerName: GROOMERS[groomerId].name,
            date,
            time,
            displayTime: formatDisplayTime(time),
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
      isPast: date < today,
      slots: slots.sort((a, b) => a.time.localeCompare(b.time)),
    };
  });
}

export function nextWeekStart(weekStart: string): string {
  return addDays(weekStart, 7);
}
