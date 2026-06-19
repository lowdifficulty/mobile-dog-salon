import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import { isFollowUpDue, syncLeadsWithAppointments } from "@/lib/leads/sync";

export async function GET() {
  try {
    await requireAdmin();
    const leads = await syncLeadsWithAppointments();
    return NextResponse.json({
      leads: leads.map((lead) => ({
        ...lead,
        followUpDue: isFollowUpDue(lead),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
