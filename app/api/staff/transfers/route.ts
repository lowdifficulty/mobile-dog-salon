import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/scheduling/auth";
import { GROOMERS } from "@/lib/scheduling/groomers";
import { readSchedulingData } from "@/lib/scheduling/store";
import { getLeadById } from "@/lib/leads/store";
import type { GroomerId } from "@/lib/scheduling/types";
import { createStaffTransfer } from "@/lib/staff/transfers";

export async function POST(request: Request) {
  try {
    const user = await requireStaff();
    const body = (await request.json()) as {
      type?: "lead" | "appointment";
      leadId?: string;
      appointmentId?: string;
      toGroomerId?: GroomerId;
    };

    const type = body.type;
    const toGroomerId = body.toGroomerId;

    if (!type || (type !== "lead" && type !== "appointment")) {
      return NextResponse.json({ error: "Invalid transfer type" }, { status: 400 });
    }
    if (!toGroomerId || !GROOMERS[toGroomerId]) {
      return NextResponse.json({ error: "Invalid groomer" }, { status: 400 });
    }
    if (user.role === "groomer" && user.groomerId === toGroomerId) {
      return NextResponse.json({ error: "Cannot send to yourself" }, { status: 400 });
    }

    if (type === "lead") {
      if (!body.leadId) {
        return NextResponse.json({ error: "leadId required" }, { status: 400 });
      }
      const lead = await getLeadById(body.leadId);
      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }
    } else {
      if (!body.appointmentId) {
        return NextResponse.json({ error: "appointmentId required" }, { status: 400 });
      }
      const data = await readSchedulingData();
      const appointment = data.appointments.find((a) => a.id === body.appointmentId);
      if (!appointment) {
        return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
      }
    }

    const transfer = await createStaffTransfer({
      type,
      leadId: body.leadId,
      appointmentId: body.appointmentId,
      fromName: user.name,
      fromGroomerId: user.role === "groomer" ? user.groomerId : undefined,
      toGroomerId,
    });

    return NextResponse.json({ transfer });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
