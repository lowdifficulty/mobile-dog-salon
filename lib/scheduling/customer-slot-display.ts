import { WORK_END_HOUR, WORK_START_HOUR } from "./groomers";
import type { AvailableSlot, GroomerId } from "./types";

/** Jessica public calendar — max bookable openings per day (spread across the day). */
export const JESSICA_MAX_CUSTOMER_SLOTS_PER_DAY = 3;

function maxSlotsPerDayForGroomer(groomerId: GroomerId): number | null {
  if (groomerId === "jessica") return JESSICA_MAX_CUSTOMER_SLOTS_PER_DAY;
  return null;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function compareSlots(a: AvailableSlot, b: AvailableSlot): number {
  const t = a.time.localeCompare(b.time);
  if (t !== 0) return t;
  return a.groomerId.localeCompare(b.groomerId);
}

/** Pick up to `max` slots spread across the day's availability (not consecutive blocks). */
function limitGroomerSlotsSpread(slots: AvailableSlot[], max: number): AvailableSlot[] {
  if (slots.length <= max) {
    return [...slots].sort(compareSlots);
  }

  const sorted = [...slots].sort(compareSlots);
  const minMin = timeToMinutes(sorted[0].time);
  const maxMin = timeToMinutes(sorted[sorted.length - 1].time);

  const spanStart = minMin === maxMin ? WORK_START_HOUR * 60 : minMin;
  const spanEnd = minMin === maxMin ? WORK_END_HOUR * 60 : maxMin;
  const span = Math.max(spanEnd - spanStart, 1);

  const targetFractions = [0.2, 0.5, 0.8];
  const targets = targetFractions.map((f) => spanStart + span * f);

  const picked: AvailableSlot[] = [];
  const usedKeys = new Set<string>();
  const usedTimes = new Set<number>();

  const tryPick = (allowDuplicateTime: boolean) => {
    for (const target of targets) {
      if (picked.length >= max) break;

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
    if (picked.length >= max) break;
    if (!usedKeys.has(slot.slotKey)) {
      picked.push(slot);
      usedKeys.add(slot.slotKey);
    }
  }

  return picked.sort(compareSlots);
}

/**
 * Public booking calendar slots per day.
 * Capped groomers (Jessica) show up to three spread openings; others show all marked blocks.
 */
export function limitCustomerSlotsPerDay(slots: AvailableSlot[]): AvailableSlot[] {
  if (slots.length === 0) return slots;

  const byGroomer = new Map<GroomerId, AvailableSlot[]>();
  for (const slot of slots) {
    const list = byGroomer.get(slot.groomerId) ?? [];
    list.push(slot);
    byGroomer.set(slot.groomerId, list);
  }

  const result: AvailableSlot[] = [];
  for (const [groomerId, groomerSlots] of byGroomer) {
    const max = maxSlotsPerDayForGroomer(groomerId);
    if (max == null) {
      result.push(...[...groomerSlots].sort(compareSlots));
    } else {
      result.push(...limitGroomerSlotsSpread(groomerSlots, max));
    }
  }

  return result.sort(compareSlots);
}
