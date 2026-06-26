/** Every booked appointment blocks a 3-hour window on the groomer calendar. */
export const BOOKING_DURATION_MINUTES = 180;

/** Groomers open/close availability in 3-hour blocks on their calendar. */
export const GROOMER_AVAILABILITY_BLOCK_MINUTES = 180;

/** Legacy per-service durations (display only; booking always uses BOOKING_DURATION_MINUTES). */
export const SERVICE_DURATION_MINUTES: Record<string, number> = {
  signature: 180,
  "bath-brush": 90,
  "full-groom": 180,
  "cat-bath": 90,
  "cat-groom": 180,
  "nail-only": 30,
  "teeth-only": 30,
};

export function serviceDurationMinutes(service: string): number {
  return BOOKING_DURATION_MINUTES;
}

export function formatDurationLabel(minutes: number): string {
  const hours = minutes / 60;
  return Number.isInteger(hours)
    ? hours === 1
      ? "1 hour"
      : `${hours} hours`
    : `${minutes} minutes`;
}
