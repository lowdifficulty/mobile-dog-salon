/** Appointment length in minutes by service value */
export const SERVICE_DURATION_MINUTES: Record<string, number> = {
  signature: 120,
  "bath-brush": 90,
  "full-groom": 120,
  "nail-only": 30,
  "teeth-only": 30,
};

export function serviceDurationMinutes(service: string): number {
  return SERVICE_DURATION_MINUTES[service] ?? 90;
}
