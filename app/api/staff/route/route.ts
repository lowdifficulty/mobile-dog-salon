import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/scheduling/auth";
import { readSchedulingData } from "@/lib/scheduling/store";
import {
  buildDailyRoutePlan,
  listGroomerScheduledDates,
} from "@/lib/scheduling/daily-route";
import { BOOKABLE_GROOMER_IDS } from "@/lib/scheduling/groomers";
import { getTodayPacificDate } from "@/lib/scheduling/slots";
import type { GroomerId } from "@/lib/scheduling/types";

function parseGroomerId(value: string | null): GroomerId | null {
  if (value === "melanie" || value === "diamond" || value === "jessica") {
    return value;
  }
  return null;
}

/** Staff view of a groomer's daily driving route (Mary — territory review). */
export async function GET(request: Request) {
  try {
    await requireStaff();
    const { searchParams } = new URL(request.url);
    const groomerId = parseGroomerId(searchParams.get("groomerId"));
    const date = searchParams.get("date");

    const data = await readSchedulingData();

    if (!groomerId) {
      const today = getTodayPacificDate();
      const groomers = BOOKABLE_GROOMER_IDS.map((id) => {
        const scheduledDates = listGroomerScheduledDates(data.appointments, id);
        const defaultDate =
          scheduledDates.find((d) => d >= today) ?? scheduledDates[0] ?? null;
        return { groomerId: id, scheduledDates, defaultDate };
      });
      const defaultGroomerId =
        groomers.find((g) => g.defaultDate)?.groomerId ?? BOOKABLE_GROOMER_IDS[0];
      return NextResponse.json({ groomers, defaultGroomerId });
    }

    const scheduledDates = listGroomerScheduledDates(data.appointments, groomerId);

    if (!date) {
      const today = getTodayPacificDate();
      const defaultDate =
        scheduledDates.find((d) => d >= today) ?? scheduledDates[0] ?? today;
      return NextResponse.json({ groomerId, scheduledDates, defaultDate });
    }

    const route = await buildDailyRoutePlan(data.appointments, groomerId, date);
    return NextResponse.json({
      groomerId,
      scheduledDates,
      date,
      route,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not build route";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Staff route error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
