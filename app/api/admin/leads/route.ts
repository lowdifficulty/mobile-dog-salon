import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import { isLeadCurrentlyActive } from "@/lib/leads/activity";
import { leadMatchesCrmView, withLeadDefaults, type LeadCrmView } from "@/lib/leads/filters";
import { isFollowUpDue, syncLeadsWithAppointments } from "@/lib/leads/sync";

const VALID_VIEWS: LeadCrmView[] = ["active", "scheduled", "cold_storage"];

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const viewParam = searchParams.get("view") ?? "active";
    const view = VALID_VIEWS.includes(viewParam as LeadCrmView)
      ? (viewParam as LeadCrmView)
      : "active";

    const leads = await syncLeadsWithAppointments();
    const filtered = leads
      .map(withLeadDefaults)
      .filter((lead) => leadMatchesCrmView(lead, view))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return NextResponse.json({
      leads: filtered.map((lead) => ({
        ...lead,
        followUpDue: isFollowUpDue(lead),
        currentlyActive: isLeadCurrentlyActive(lead),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
