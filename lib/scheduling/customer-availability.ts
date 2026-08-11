import {
  getAvailableSlotsForDate,
  getDatesWithAvailability,
  getRangeAvailability,
  type WeekDayAvailability,
} from "./slots";
import { getSchedulingDataVersion } from "./store";
import type { AvailableSlot, SchedulingData } from "./types";

const RANGE_CACHE_MS = 30_000;
const rangeCache = new Map<
  string,
  { at: number; days: WeekDayAvailability[] }
>();

function rangeCacheKey(
  fromDate: string,
  dayCount: number,
  service: string,
  dataVersion: number
): string {
  return `${dataVersion}|${fromDate}|${dayCount}|${service}`;
}

/**
 * Groomer-marked shifts used for the public booking calendar.
 * Bookability (appointments, van overlap) is enforced in getAvailableSlotsForDate via isSlotTaken.
 */
export function customerAvailabilityDays(data: SchedulingData) {
  return data.availability;
}

export function getCustomerAvailableSlotsForDate(
  date: string,
  data: SchedulingData,
  service: string
): AvailableSlot[] {
  return getAvailableSlotsForDate(
    date,
    customerAvailabilityDays(data),
    data.appointments,
    service
  );
}

export function getCustomerDatesWithAvailability(
  data: SchedulingData,
  service: string,
  fromDate: string,
  toDate: string
): string[] {
  const days = customerAvailabilityDays(data);
  return getDatesWithAvailability(days, data.appointments, service, fromDate, toDate);
}

export function getCustomerRangeAvailability(
  fromDate: string,
  dayCount: number,
  data: SchedulingData,
  service: string
) {
  const dataVersion = getSchedulingDataVersion();
  const key = rangeCacheKey(fromDate, dayCount, service, dataVersion);
  const cached = rangeCache.get(key);
  if (cached && Date.now() - cached.at < RANGE_CACHE_MS) {
    return cached.days;
  }

  const days = customerAvailabilityDays(data);
  const result = getRangeAvailability(
    fromDate,
    dayCount,
    days,
    data.appointments,
    service
  );
  rangeCache.set(key, { at: Date.now(), days: result });
  if (rangeCache.size > 32) {
    const oldest = [...rangeCache.entries()].sort((a, b) => a[1].at - b[1].at)[0]?.[0];
    if (oldest) rangeCache.delete(oldest);
  }
  return result;
}
