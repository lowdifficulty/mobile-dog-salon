import { NextResponse } from "next/server";
import { getAppointmentByPhone } from "@/lib/client/my-appointment";
import { requireMyAppointmentPhone } from "@/lib/client/my-appointment-session";
import {
  cancelAppointment,
  rescheduleAppointment,
} from "@/lib/scheduling/appointment-actions";
import { formatPhoneDisplay } from "@/lib/leads/normalize";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const phone = await requireMyAppointmentPhone();
    const { id } = await context.params;
    const appointment = await getAppointmentByPhone(phone, id);
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action, slotKey } = body as { action?: string; slotKey?: string };
    const actor = `public:phone:${formatPhoneDisplay(phone)}`;

    if (action === "cancel") {
      const result = await cancelAppointment(id, actor);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({ appointment: result.appointment });
    }

    if (action === "reschedule") {
      if (!slotKey) {
        return NextResponse.json({ error: "slotKey required" }, { status: 400 });
      }
      const result = await rescheduleAppointment(id, slotKey, actor);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({ appointment: result.appointment });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
