import { SHIFT_HORIZON_MONTHS } from "./groomers";
import { addDays, addMonthsToDate, getShiftHorizonEndDate } from "./slots";

export type StaffRecurrenceFrequency =
  | "none"
  | "weekly"
  | "monthly"
  | "every-2-months"
  | "every-3-months";

export const STAFF_RECURRENCE_OPTIONS: {
  value: StaffRecurrenceFrequency;
  label: string;
}[] = [
  { value: "none", label: "One time only" },
  { value: "weekly", label: "Once a week" },
  { value: "monthly", label: "Once a month" },
  { value: "every-2-months", label: "Once every other month" },
  { value: "every-3-months", label: "Once every 3 months" },
];

export function staffRecurrenceLabel(frequency: StaffRecurrenceFrequency): string {
  return (
    STAFF_RECURRENCE_OPTIONS.find((option) => option.value === frequency)?.label ??
    "One time only"
  );
}

export function isStaffRecurrenceFrequency(
  value: string | undefined | null
): value is StaffRecurrenceFrequency {
  return STAFF_RECURRENCE_OPTIONS.some((option) => option.value === value);
}

/** Dates for a recurring staff series through the shift horizon (default 3 months). */
export function listRecurringStaffDates(
  startDate: string,
  frequency: StaffRecurrenceFrequency,
  maxDate = getShiftHorizonEndDate(SHIFT_HORIZON_MONTHS)
): string[] {
  if (frequency === "none") return [startDate];

  const dates = [startDate];
  let current = startDate;

  while (true) {
    const next =
      frequency === "weekly"
        ? addDays(current, 7)
        : frequency === "monthly"
          ? addMonthsToDate(current, 1)
          : frequency === "every-2-months"
            ? addMonthsToDate(current, 2)
            : addMonthsToDate(current, 3);

    if (next > maxDate) break;
    dates.push(next);
    current = next;
  }

  return dates;
}
