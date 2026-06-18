import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import { getAvailabilityHistoryEntry } from "@/lib/scheduling/history";
import { writeSchedulingData } from "@/lib/scheduling/store";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const historyId = body.historyId as string | undefined;

    if (!historyId) {
      return NextResponse.json({ error: "historyId required" }, { status: 400 });
    }

    const entry = await getAvailabilityHistoryEntry(historyId);
    if (!entry) {
      return NextResponse.json({ error: "History entry not found" }, { status: 404 });
    }

    await writeSchedulingData(entry.scheduling, {
      action: "admin_restore",
      actor: admin.email,
    });

    return NextResponse.json({
      success: true,
      restoredAt: entry.at,
      summary: entry.summary,
    });
  } catch (err) {
    console.error("Restore availability failed:", err);
    return NextResponse.json({ error: "Could not restore calendar" }, { status: 500 });
  }
}
