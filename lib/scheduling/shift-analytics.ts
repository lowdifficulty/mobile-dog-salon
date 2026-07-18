import { BOOKABLE_GROOMER_IDS, groomerName } from "./groomers";
import { listBookingBlockStarts } from "./availability";
import { listAvailableVanTimeslots } from "./van-capacity";
import { VAN_IDS } from "./vans";
import { addDays, getTodayPacificDate } from "./slots";
import type { GroomerId, SchedulingData } from "./types";

export interface ShiftWindowCounts {
  days7: number;
  days14: number;
  days30: number;
}

export interface GroomerShiftAnalytics {
  groomerId: GroomerId;
  groomerName: string;
  days7: number;
  days14: number;
  days30: number;
}

export interface ShiftAnalyticsSummary {
  available: ShiftWindowCounts;
  groomers: GroomerShiftAnalytics[];
}

const WINDOWS = [7, 14, 30] as const;

function inclusiveEndDate(from: string, dayCount: number): string {
  return addDays(from, dayCount - 1);
}

function countAvailableShifts(
  data: SchedulingData,
  from: string,
  to: string
): number {
  return VAN_IDS.reduce(
    (sum, van) =>
      sum +
      listAvailableVanTimeslots(data.appointments, data.availability, { from, to, van })
        .length,
    0
  );
}

function countGroomerShifts(
  data: SchedulingData,
  groomerId: GroomerId,
  from: string,
  to: string
): number {
  let count = 0;
  for (const day of data.availability) {
    if (day.groomerId !== groomerId) continue;
    if (day.date < from || day.date > to) continue;
    count += listBookingBlockStarts(day.times).length;
  }
  return count;
}

export function shiftAnalyticsSummary(data: SchedulingData): ShiftAnalyticsSummary {
  const from = getTodayPacificDate();

  const available: ShiftWindowCounts = { days7: 0, days14: 0, days30: 0 };
  for (const days of WINDOWS) {
    const to = inclusiveEndDate(from, days);
    const count = countAvailableShifts(data, from, to);
    if (days === 7) available.days7 = count;
    else if (days === 14) available.days14 = count;
    else available.days30 = count;
  }

  const groomers: GroomerShiftAnalytics[] = BOOKABLE_GROOMER_IDS.map((groomerId) => {
    const row: GroomerShiftAnalytics = {
      groomerId,
      groomerName: groomerName(groomerId),
      days7: 0,
      days14: 0,
      days30: 0,
    };
    for (const days of WINDOWS) {
      const to = inclusiveEndDate(from, days);
      const count = countGroomerShifts(data, groomerId, from, to);
      if (days === 7) row.days7 = count;
      else if (days === 14) row.days14 = count;
      else row.days30 = count;
    }
    return row;
  });

  return { available, groomers };
}
