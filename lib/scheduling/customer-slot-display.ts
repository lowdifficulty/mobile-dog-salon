import type { AvailableSlot } from "./types";

function compareSlots(a: AvailableSlot, b: AvailableSlot): number {
  const t = a.time.localeCompare(b.time);
  if (t !== 0) return t;
  return a.groomerId.localeCompare(b.groomerId);
}

/**
 * Public booking calendar slots per day.
 * Listed openings are the remaining bookable blocks (no extra per-groomer display cap).
 */
export function limitCustomerSlotsPerDay(slots: AvailableSlot[]): AvailableSlot[] {
  return [...slots].sort(compareSlots);
}
