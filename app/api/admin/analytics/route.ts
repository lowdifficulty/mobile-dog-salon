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
    const rangeParam = searchParams.get("range") ?? "week";
    const range = VALID_RANGES.includes(rangeParam as AnalyticsRange)
      ? (rangeParam as AnalyticsRange)
      : "week";

    const dateParam = searchParams.get("date") ?? "";
    const customDate =
      range === "custom"
        ? isValidAnalyticsDate(dateParam)
          ? dateParam
          : getTodayPacificDate()
        : undefined;

    const leads = leadsForAnalytics(await syncLeadsWithAppointments());
    const { appointments } = await readSchedulingData();
    const analytics = await computeFunnelAnalytics(leads, range, customDate, appointments);

    return NextResponse.json(analytics);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
