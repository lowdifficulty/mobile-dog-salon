import { effectiveAvailability } from "./effective-availability";
import {
  getAvailableSlotsForDate,
  getDatesWithAvailability,
  getRangeAvailability,
} from "./slots";
import type { AvailableSlot, SchedulingData } from "./types";

/** Availability after removing hours covered by confirmed appointments — same input as booking validation. */
export function customerAvailabilityDays(data: SchedulingData) {
  return effectiveAvailability(data);
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
  const days = customerAvailabilityDays(data);
  return getRangeAvailability(
    fromDate,
    dayCount,
    days,
    data.appointments,
    service
  );
}
