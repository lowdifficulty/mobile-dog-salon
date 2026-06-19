import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import {
  type AnalyticsRange,
  computeFunnelAnalytics,
} from "@/lib/leads/analytics";
import { leadsForAnalytics } from "@/lib/leads/filters";
import { readFunnelViews } from "@/lib/leads/store";
import { syncLeadsWithAppointments } from "@/lib/leads/sync";

const VALID_RANGES: AnalyticsRange[] = ["today", "week", "month", "all"];

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get("range") ?? "week";
    const range = VALID_RANGES.includes(rangeParam as AnalyticsRange)
      ? (rangeParam as AnalyticsRange)
      : "week";

    const leads = leadsForAnalytics(await syncLeadsWithAppointments());
    const funnelViews = await readFunnelViews();
    const analytics = computeFunnelAnalytics(leads, range, funnelViews);

    return NextResponse.json(analytics);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
