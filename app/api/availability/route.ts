import { NextResponse } from "next/server";
import { readSchedulingData } from "@/lib/scheduling/store";
import {
  getAvailableSlotsForDate,
  getDatesWithAvailability,
  getWeekAvailability,
  getWeekStart,
} from "@/lib/scheduling/slots";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const service = searchParams.get("service") ?? "full-groom";
  const month = searchParams.get("month"); // YYYY-MM for date list
  const week = searchParams.get("week"); // YYYY-MM-DD week start (Sunday)

  const data = await readSchedulingData();

  if (week) {
    const weekStart = getWeekStart(week);
    const days = getWeekAvailability(
      weekStart,
      data.availability,
      data.appointments,
      service
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
    return NextResponse.json({ error: "date or month required" }, { status: 400 });
  }

  const slots = getAvailableSlotsForDate(
    date,
    data.availability,
    data.appointments,
    service
  );

  return NextResponse.json({ slots });
}
