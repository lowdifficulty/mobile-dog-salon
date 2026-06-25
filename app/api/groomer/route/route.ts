import { NextResponse } from "next/server";
import { requireGroomer } from "@/lib/scheduling/auth";
import { readSchedulingData } from "@/lib/scheduling/store";
import {
  buildDailyRoutePlan,
  listGroomerScheduledDates,
} from "@/lib/scheduling/daily-route";
import { getTodayPacificDate } from "@/lib/scheduling/slots";

export async function GET(request: Request) {
  try {
    const user = await requireGroomer();
    const groomerId = user.groomerId;
    if (!groomerId) {
      return NextResponse.json({ error: "Invalid groomer session" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    const data = await readSchedulingData();
    const scheduledDates = listGroomerScheduledDates(data.appointments, groomerId);

    if (!date) {
      const today = getTodayPacificDate();
      const defaultDate =
        scheduledDates.find((d) => d >= today) ?? scheduledDates[0] ?? today;
      return NextResponse.json({ scheduledDates, defaultDate });
    }

    const route = await buildDailyRoutePlan(data.appointments, groomerId, date);
    if (!route) {
      return NextResponse.json({
        scheduledDates,
        date,
        route: null,
      });
    }

    return NextResponse.json({
      scheduledDates,
      date,
      route,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not build route";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Groomer route error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
