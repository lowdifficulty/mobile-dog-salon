import { NextResponse } from "next/server";
import {
  computeGroomerAccountingSummary,
  groomerHasAccounting,
} from "@/lib/analytics/groomer-accounting";
import { listRecentPayments } from "@/lib/payments/gateway";
import { requireGroomer } from "@/lib/scheduling/auth";
import { readSchedulingData } from "@/lib/scheduling/store";
import { getTodayPacificDate } from "@/lib/scheduling/slots";

export async function GET(request: Request) {
  try {
    const user = await requireGroomer();
    const groomerId = user.groomerId;
    if (!groomerId || !groomerHasAccounting(groomerId)) {
      return NextResponse.json({ error: "Accounting is not available" }, { status: 403 });
    }

    const monthParam = new URL(request.url).searchParams.get("month");
    const today = getTodayPacificDate();
    const month = monthParam?.trim() || today.slice(0, 7);

    const { appointments } = await readSchedulingData();
    let payments: Awaited<ReturnType<typeof listRecentPayments>> = [];
    try {
      payments = await listRecentPayments(500);
    } catch (err) {
      console.error("Groomer accounting payment load failed:", err);
    }

    const summary = computeGroomerAccountingSummary({
      groomerId,
      appointments,
      payments,
      month,
    });

    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
