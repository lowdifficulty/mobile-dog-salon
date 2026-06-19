import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import {
  cancelAppointment,
  rescheduleAppointment,
} from "@/lib/scheduling/appointment-actions";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = await request.json();
    const action = body.action as string;

    if (action === "cancel") {
      const result = await cancelAppointment(id, admin.email);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({ ok: true, appointment: result.appointment });
    }

    if (action === "reschedule") {
      const slotKey = body.slotKey as string | undefined;
      if (!slotKey) {
        return NextResponse.json({ error: "slotKey is required" }, { status: 400 });
      }
      const result = await rescheduleAppointment(id, slotKey, admin.email);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({ ok: true, appointment: result.appointment });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
