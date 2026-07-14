import { NextResponse } from "next/server";
import { computeAccountingSummary } from "@/lib/analytics/accounting";
import { requireAdmin } from "@/lib/scheduling/auth";
import { readSchedulingData } from "@/lib/scheduling/store";

export async function GET() {
  try {
    await requireAdmin();
    const data = await readSchedulingData();
    const summary = computeAccountingSummary(data.appointments);
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
