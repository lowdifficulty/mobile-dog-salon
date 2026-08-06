import type { AvailableSlot } from "./types";

function compareSlots(a: AvailableSlot, b: AvailableSlot): number {
  const t = a.time.localeCompare(b.time);
  if (t !== 0) return t;
  return a.groomerId.localeCompare(b.groomerId);
}

/** Public booking shows every open slot groomers marked (no daily cap). */
export function limitCustomerSlotsPerDay(slots: AvailableSlot[]): AvailableSlot[] {
  return [...slots].sort(compareSlots);
}
