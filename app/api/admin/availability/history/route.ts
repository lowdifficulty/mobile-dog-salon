import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import { readAvailabilityHistory } from "@/lib/scheduling/history";
import { getSchedulingPersistenceStatus } from "@/lib/scheduling/store";

export async function GET() {
  try {
    await requireAdmin();
    const entries = await readAvailabilityHistory();
    return NextResponse.json({
      persistence: getSchedulingPersistenceStatus(),
      entries,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
