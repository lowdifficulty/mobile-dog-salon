/** Every booked appointment blocks a 2-hour window on the groomer calendar. */
export const BOOKING_DURATION_MINUTES = 120;

/** Legacy per-service durations (display only; booking always uses BOOKING_DURATION_MINUTES). */
export const SERVICE_DURATION_MINUTES: Record<string, number> = {
  signature: 120,
  "bath-brush": 90,
  "full-groom": 120,
  "cat-bath": 90,
  "cat-groom": 120,
  "nail-only": 30,
  "teeth-only": 30,
};

export function serviceDurationMinutes(service: string): number {
  return BOOKING_DURATION_MINUTES;
}
