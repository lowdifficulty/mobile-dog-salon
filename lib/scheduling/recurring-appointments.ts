import { SHIFT_HORIZON_MONTHS } from "./groomers";
import { addDays, addMonthsToDate, getShiftHorizonEndDate } from "./slots";

export type StaffRecurrenceFrequency =
  | "none"
  | "weekly"
  | "biweekly"
  | "every-4-weeks"
  | "monthly"
  | "every-8-weeks"
  | "every-2-months"
  | "every-3-months";

export const STAFF_RECURRENCE_OPTIONS: {
  value: StaffRecurrenceFrequency;
  label: string;
}[] = [
  { value: "none", label: "One time only" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly (every 2 weeks)" },
  { value: "every-4-weeks", label: "Every 4 weeks" },
  { value: "monthly", label: "Every month" },
  { value: "every-8-weeks", label: "Every 8 weeks" },
  { value: "every-2-months", label: "Every 2 months" },
  { value: "every-3-months", label: "Every 3 months" },
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

function nextRecurringStaffDate(
  current: string,
  frequency: StaffRecurrenceFrequency
): string {
  switch (frequency) {
    case "weekly":
      return addDays(current, 7);
    case "biweekly":
      return addDays(current, 14);
    case "every-4-weeks":
      return addDays(current, 28);
    case "monthly":
      return addMonthsToDate(current, 1);
    case "every-8-weeks":
      return addDays(current, 56);
    case "every-2-months":
      return addMonthsToDate(current, 2);
    case "every-3-months":
      return addMonthsToDate(current, 3);
    default:
      return current;
  }
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
    const next = nextRecurringStaffDate(current, frequency);
    if (next > maxDate) break;
    dates.push(next);
    current = next;
  }

  return dates;
}
