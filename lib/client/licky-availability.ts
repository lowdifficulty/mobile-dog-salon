import "server-only";

import { groomerAcceptsBookings } from "@/lib/scheduling/groomers";
import { buildFallbackRangeDays } from "@/lib/scheduling/fallback-availability";
import { getBlockedSlotKeys } from "@/lib/scheduling/slot-holds";
import { getSchedulingPersistenceStatus } from "@/lib/scheduling/store";
import { readSchedulingData } from "@/lib/scheduling/store";
import {
  getRangeAvailability,
  getTodayPacificDate,
} from "@/lib/scheduling/slots";
import type { AvailableSlot, GroomerId } from "@/lib/scheduling/types";

function sanitizeDays(days: number | undefined): number {
  if (typeof days !== "number" || !Number.isFinite(days)) return 14;
  return Math.min(30, Math.max(1, Math.round(days)));
}

function sanitizeGroomerId(raw: string | undefined): GroomerId | undefined {
  const id = raw?.trim().toLowerCase();
  if (id === "melanie" || id === "diamond" || id === "jessica") {
    return groomerAcceptsBookings(id) ? id : undefined;
  }
  return undefined;
}

/**
 * Same calendar data as /api/availability — used by Licky tools.
 */
export async function getLickyAvailabilitySlots(options: {
  service?: string;
  days?: number;
  groomerId?: string;
  holdOwnerId?: string;
}): Promise<{
  slots: AvailableSlot[];
  from: string;
  days: number;
  service: string;
  groomerId?: GroomerId;
  source: "live" | "fallback";
  persistenceMode: string;
}> {
  const service = options.service?.trim() || "full-groom";
  const days = sanitizeDays(options.days);
  const groomerId = sanitizeGroomerId(options.groomerId);
  const from = getTodayPacificDate();
  const persistence = getSchedulingPersistenceStatus();

  const data = await readSchedulingData();
  let range = getRangeAvailability(
    from,
    days,
    data.availability,
    data.appointments,
    service
  );

  let source: "live" | "fallback" = "live";

  const liveSlotCount = range.reduce((n, day) => n + day.slots.length, 0);
  if (liveSlotCount === 0 && data.availability.length === 0) {
    range = buildFallbackRangeDays(from, days);
    source = "fallback";
  }

  let slots = range.flatMap((day) => day.slots);
  if (groomerId) {
    slots = slots.filter((s) => s.groomerId === groomerId);
  }

  const blocked = await getBlockedSlotKeys(options.holdOwnerId);
  if (blocked.size) {
    slots = slots.filter((s) => !blocked.has(s.slotKey));
  }

  return {
    slots,
    from,
    days,
    service,
    groomerId,
    source,
    persistenceMode: persistence.mode,
  };
}
