import { NextResponse } from "next/server";
import { ensureContactFromAppointment } from "@/lib/crm/messaging";
import { readSchedulingData } from "@/lib/scheduling/store";
import { requireStaff } from "@/lib/scheduling/auth";

export async function GET(request: Request) {
  try {
    await requireStaff();
    const appointmentId = new URL(request.url).searchParams.get("appointmentId")?.trim();
    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId required" }, { status: 400 });
    }

    const { appointments } = await readSchedulingData();
    const appointment = appointments.find((ap) => ap.id === appointmentId);
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const contact = await ensureContactFromAppointment(appointment);
    return NextResponse.json({ contactId: contact.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not open conversation";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
