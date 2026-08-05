import { WORK_END_HOUR, WORK_START_HOUR } from "./groomers";
import type { AvailableSlot } from "./types";

/** Max bookable openings shown per calendar day on public booking. */
export const MAX_CUSTOMER_SLOTS_PER_DAY = 3;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function compareSlots(a: AvailableSlot, b: AvailableSlot): number {
  const t = a.time.localeCompare(b.time);
  if (t !== 0) return t;
  return a.groomerId.localeCompare(b.groomerId);
}

/**
 * Pick up to three slots spread across the day's availability (not consecutive blocks).
 */
export function limitCustomerSlotsPerDay(slots: AvailableSlot[]): AvailableSlot[] {
  if (slots.length <= MAX_CUSTOMER_SLOTS_PER_DAY) {
    return [...slots].sort(compareSlots);
  }

  const sorted = [...slots].sort(compareSlots);
  const minMin = timeToMinutes(sorted[0].time);
  const maxMin = timeToMinutes(sorted[sorted.length - 1].time);

  const spanStart =
    minMin === maxMin ? WORK_START_HOUR * 60 : minMin;
  const spanEnd =
    minMin === maxMin ? WORK_END_HOUR * 60 : maxMin;
  const span = Math.max(spanEnd - spanStart, 1);

  const targetFractions = [0.2, 0.5, 0.8];
  const targets = targetFractions.map((f) => spanStart + span * f);

  const picked: AvailableSlot[] = [];
  const usedKeys = new Set<string>();
  const usedTimes = new Set<number>();

  const tryPick = (allowDuplicateTime: boolean) => {
    for (const target of targets) {
      if (picked.length >= MAX_CUSTOMER_SLOTS_PER_DAY) break;

      let best: AvailableSlot | null = null;
      let bestDist = Infinity;

      for (const slot of sorted) {
        if (usedKeys.has(slot.slotKey)) continue;
        const tMin = timeToMinutes(slot.time);
        if (!allowDuplicateTime && usedTimes.has(tMin)) continue;

        const dist = Math.abs(tMin - target);
        if (dist < bestDist) {
          bestDist = dist;
          best = slot;
        }
      }

      if (best) {
        picked.push(best);
        usedKeys.add(best.slotKey);
        usedTimes.add(timeToMinutes(best.time));
      }
    }
  };

  tryPick(false);
  tryPick(true);

  for (const slot of sorted) {
    if (picked.length >= MAX_CUSTOMER_SLOTS_PER_DAY) break;
    if (!usedKeys.has(slot.slotKey)) {
      picked.push(slot);
      usedKeys.add(slot.slotKey);
    }
  }

  return picked.sort(compareSlots);
}
