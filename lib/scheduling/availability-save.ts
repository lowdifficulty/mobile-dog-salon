import { NextResponse } from "next/server";
import {
  mergeGroomerVanAvailabilitySave,
  normalizeGroomerAvailabilitySave,
} from "@/lib/scheduling/effective-availability";
import { rejectUnavailableGroomerShifts } from "@/lib/scheduling/van-capacity";
import { isVanId, vanForGroomer } from "@/lib/scheduling/vans";
import type { AvailabilityDay, GroomerId, SchedulingData } from "@/lib/scheduling/types";

import type { VanId } from "./vans";

export function resolveSaveVan(groomerId: GroomerId, vanRaw: string | undefined): VanId {
  if (isVanId(vanRaw)) return vanRaw;
  return vanForGroomer(groomerId);
}

function parseRemovedDates(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d));
}

export function applyGroomerAvailabilitySave(
  data: SchedulingData,
  groomerId: GroomerId,
  incoming: AvailabilityDay[],
  vanRaw: string | undefined,
  removedDatesRaw?: unknown
): { error: string | null; sanitized: AvailabilityDay[] } {
  const removedDates = parseRemovedDates(removedDatesRaw);
  const van = resolveSaveVan(groomerId, vanRaw);
  const sanitized = normalizeGroomerAvailabilitySave(
    groomerId,
    incoming
      .filter((a) => a.date && Array.isArray(a.times))
      .map((a) => ({
        groomerId,
        date: a.date,
        times: [...new Set(a.times)].sort(),
      })),
    van
  );

  const shiftError = rejectUnavailableGroomerShifts(data, groomerId, sanitized, van);
  if (shiftError) {
    return { error: shiftError, sanitized: [] };
  }

  data.availability = mergeGroomerVanAvailabilitySave(
    data.availability,
    groomerId,
    van,
    sanitized,
    removedDates
  );

  return { error: null, sanitized };
}

export function availabilitySaveErrorResponse(error: string) {
  return NextResponse.json({ error }, { status: 409 });
}
