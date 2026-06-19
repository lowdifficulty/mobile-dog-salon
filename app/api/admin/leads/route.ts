import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import { leadMatchesCrmView, withLeadDefaults } from "@/lib/leads/filters";
import { isFollowUpDue, syncLeadsWithAppointments } from "@/lib/leads/sync";
import type { LeadListStatus } from "@/lib/leads/types";

const VALID_VIEWS: LeadListStatus[] = ["active", "cold_storage"];

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const viewParam = searchParams.get("view") ?? "active";
    const view = VALID_VIEWS.includes(viewParam as LeadListStatus)
      ? (viewParam as LeadListStatus)
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
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
