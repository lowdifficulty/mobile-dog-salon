import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/scheduling/auth";
import {
  cancelAppointment,
  deleteAppointment,
  rescheduleAppointment,
} from "@/lib/scheduling/appointment-actions";
import type { GroomerId } from "@/lib/scheduling/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireStaff();
    const { id } = await context.params;
    const body = await request.json();
    const action = body.action as string;
    const groomerOptions =
      user.role === "groomer" && user.groomerId
        ? { groomerId: user.groomerId as GroomerId }
        : undefined;

    if (action === "cancel") {
      const result = await cancelAppointment(id, user.email, {
        ...groomerOptions,
        cancelledVia: user.role === "admin" ? "admin" : "staff",
      });
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
      const result = await rescheduleAppointment(id, slotKey, user.email, {
        ...groomerOptions,
        overrideAvailability: Boolean(body.overrideAvailability),
        allowSameDay: Boolean(body.overrideAvailability),
      });
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

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireStaff();
    const { id } = await context.params;
    const result = await deleteAppointment(id, user.email);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, appointment: result.appointment });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
