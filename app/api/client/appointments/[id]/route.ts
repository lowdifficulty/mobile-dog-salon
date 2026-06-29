import { NextResponse } from "next/server";
import { getClientAppointment } from "@/lib/client/appointments";
import {
  cancelAppointment,
  rescheduleAppointment,
} from "@/lib/scheduling/appointment-actions";
import { requireClient } from "@/lib/payments/auth";
import { findClientById } from "@/lib/payments/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const sessionUser = await requireClient();
    const account = await findClientById(sessionUser.id);
    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { id } = await context.params;
    const appointment = await getClientAppointment(account, id);
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action, slotKey } = body as { action?: string; slotKey?: string };

    if (action === "cancel") {
      const result = await cancelAppointment(id, `client:${account.email}`);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({ appointment: result.appointment });
    }

    if (action === "reschedule") {
      if (!slotKey) {
        return NextResponse.json({ error: "slotKey required" }, { status: 400 });
      }
      const result = await rescheduleAppointment(
        id,
        slotKey,
        `client:${account.email}`
      );
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
