import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import { cancelAppointment } from "@/lib/scheduling/appointment-actions";
import { deleteLeadById, updateLeadFields } from "@/lib/leads/store";
import type { LeadFollowUpMode, LeadListStatus } from "@/lib/leads/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = (await request.json()) as {
      followUpMode?: LeadFollowUpMode;
      listStatus?: LeadListStatus;
    };

    if (
      body.followUpMode !== undefined &&
      body.followUpMode !== "fu" &&
      body.followUpMode !== "chill"
    ) {
      return NextResponse.json({ error: "Invalid followUpMode" }, { status: 400 });
    }

    if (
      body.listStatus !== undefined &&
      body.listStatus !== "active" &&
      body.listStatus !== "cold_storage"
    ) {
      return NextResponse.json({ error: "Invalid listStatus" }, { status: 400 });
    }

    const lead = await updateLeadFields(id, {
      followUpMode: body.followUpMode,
      listStatus: body.listStatus,
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const removed = await deleteLeadById(id);

    if (!removed) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (removed.appointmentId) {
      const result = await cancelAppointment(
        removed.appointmentId,
        "admin:lead-delete"
      );
      if (!result.ok && result.status !== 404 && result.status !== 409) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
