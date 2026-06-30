import { NextResponse } from "next/server";
import { isLocalhostRequest } from "@/lib/dev/is-localhost-request";
import { getOrCreateHoldOwnerId } from "@/lib/scheduling/hold-owner";
import { getBlockedSlotKeys } from "@/lib/scheduling/slot-holds";
import { readSchedulingData } from "@/lib/scheduling/store";
import {
  buildFallbackRangeDays,
  buildFallbackWeekDays,
} from "@/lib/scheduling/fallback-availability";
import {
  getAvailableSlotsForDate,
  getDatesWithAvailability,
  getRangeAvailability,
  getWeekAvailability,
  getWeekStart,
} from "@/lib/scheduling/slots";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const service = searchParams.get("service") ?? "full-groom";
  const month = searchParams.get("month"); // YYYY-MM for date list
  const week = searchParams.get("week"); // YYYY-MM-DD week start (Sunday)
  const from = searchParams.get("from"); // YYYY-MM-DD range start
  const daysParam = searchParams.get("days");

  const devAllSlots = isLocalhostRequest(request);
  let data;
  try {
    data = await readSchedulingData();
  } catch (err) {
    console.error("Availability readSchedulingData error:", err);
    return NextResponse.json({ error: "Could not load availability" }, { status: 500 });
  }

  const holdOwnerId = devAllSlots ? undefined : await getOrCreateHoldOwnerId().catch(() => undefined);
  let blockedSlotKeys = new Set<string>();
  if (!devAllSlots) {
    try {
      blockedSlotKeys = await getBlockedSlotKeys(holdOwnerId);
    } catch (err) {
      console.error("getBlockedSlotKeys error:", err);
    }
  }

  function filterBlocked<T extends { slotKey: string }>(slots: T[]): T[] {
    if (!blockedSlotKeys.size) return slots;
    return slots.filter((s) => !blockedSlotKeys.has(s.slotKey));
  }

  function filterRangeDays(
    days: ReturnType<typeof getRangeAvailability>
  ): ReturnType<typeof getRangeAvailability> {
    if (!blockedSlotKeys.size) return days;
    return days.map((day) => ({
      ...day,
      slots: filterBlocked(day.slots),
    }));
  }

  if (from && daysParam) {
    const dayCount = Number(daysParam);
    if (!Number.isFinite(dayCount) || dayCount < 1) {
      return NextResponse.json({ error: "Invalid days" }, { status: 400 });
    }
    if (devAllSlots) {
      const rangeDays = buildFallbackRangeDays(from, dayCount);
      return NextResponse.json({ from, days: rangeDays, devAllSlots: true });
    }
    const rangeDays = filterRangeDays(
      getRangeAvailability(
        from,
        dayCount,
        data.availability,
        data.appointments,
        service
      )
    );
    return NextResponse.json({ from, days: rangeDays });
  }

  if (week) {
    const weekStart = getWeekStart(week);
    if (devAllSlots) {
      const days = buildFallbackWeekDays(weekStart);
      return NextResponse.json({ weekStart, days, devAllSlots: true });
    }
    const days = filterRangeDays(
      getWeekAvailability(
        weekStart,
        data.availability,
        data.appointments,
        service
      )
    );
    return NextResponse.json({ weekStart, days });
  }

  if (month) {
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }
    const start = `${month}-01`;
    const endDate = new Date(y, m, 0);
    const end = endDate.toISOString().slice(0, 10);
    if (devAllSlots) {
      const rangeDays = buildFallbackRangeDays(start, endDate.getDate());
      const dates = rangeDays
        .filter((day) => day.slots.length > 0)
        .map((day) => day.date);
      return NextResponse.json({ dates, devAllSlots: true });
    }
    const dates = getDatesWithAvailability(
      data.availability,
      data.appointments,
      service,
      start,
      end
    );
    return NextResponse.json({ dates });
  }

  if (!date) {
    return NextResponse.json({ error: "date, month, week, or from+days required" }, { status: 400 });
  }

  if (devAllSlots) {
    const day = buildFallbackRangeDays(date, 1)[0];
    return NextResponse.json({ slots: day?.slots ?? [], devAllSlots: true });
  }

  const slots = filterBlocked(
    getAvailableSlotsForDate(
      date,
      data.availability,
      data.appointments,
      service
    )
  );

  return NextResponse.json({ slots });
}
