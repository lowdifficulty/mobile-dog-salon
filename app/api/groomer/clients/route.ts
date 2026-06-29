import { NextResponse } from "next/server";
import { patchLeadForAppointmentByGroomer } from "@/lib/leads/appointment-lead";
import type { LeadDetailsPatch } from "@/lib/leads/patch-lead";
import { listGroomerActiveClients } from "@/lib/groomer/active-clients";
import { requireGroomer } from "@/lib/scheduling/auth";

export async function GET() {
  try {
    const user = await requireGroomer();
    const clients = await listGroomerActiveClients(user.groomerId!);
    return NextResponse.json({ clients });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireGroomer();
    const body = (await request.json()) as LeadDetailsPatch & {
      appointmentId?: string;
    };
    const appointmentId = String(body.appointmentId ?? "").trim();
    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId required" }, { status: 400 });
    }

    const { appointmentId: _drop, ...patch } = body;
    const result = await patchLeadForAppointmentByGroomer(
      appointmentId,
      patch,
      user.groomerId!,
      user.email
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ lead: result.lead });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
