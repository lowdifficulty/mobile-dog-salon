import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import {
  type AnalyticsRange,
  computeFunnelAnalytics,
  isValidAnalyticsDate,
} from "@/lib/leads/analytics";
import { leadsForAnalytics } from "@/lib/leads/filters";
import { syncLeadsWithAppointments } from "@/lib/leads/sync";
import { readSchedulingData } from "@/lib/scheduling/store";
import { getTodayPacificDate } from "@/lib/scheduling/slots";

const VALID_RANGES: AnalyticsRange[] = ["today", "week", "month", "all", "custom"];

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get("range") ?? "today";
    const range = VALID_RANGES.includes(rangeParam as AnalyticsRange)
      ? (rangeParam as AnalyticsRange)
      : "today";

    const dateParam = searchParams.get("date") ?? "";
    const customDate =
      range === "custom"
        ? isValidAnalyticsDate(dateParam)
          ? dateParam
          : getTodayPacificDate()
        : undefined;

    const leads = leadsForAnalytics(await syncLeadsWithAppointments());
    const scheduling = await readSchedulingData();
    const analytics = computeFunnelAnalytics(
      leads,
      range,
      customDate,
      scheduling.appointments,
      scheduling
    );

    return NextResponse.json(analytics);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
