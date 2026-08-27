import { NextResponse } from "next/server";
import { requireGroomer } from "@/lib/scheduling/auth";
import {
  cancelAppointment,
  rescheduleAppointment,
} from "@/lib/scheduling/appointment-actions";
import {
  closeGroomerVisit,
  type GroomerVisitCloseoutInput,
} from "@/lib/scheduling/visit-closeout";
import type { AppointmentPaidVia, VisitCloseStatus } from "@/lib/scheduling/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireGroomer();
    const { id } = await context.params;
    const body = await request.json();
    const action = body.action as string;
    const groomerOptions = { groomerId: user.groomerId! };

    if (action === "cancel") {
      const result = await cancelAppointment(id, user.email, {
        ...groomerOptions,
        cancelledVia: "staff",
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
      const result = await rescheduleAppointment(
        id,
        slotKey,
        user.email,
        {
          ...groomerOptions,
          overrideAvailability: Boolean(body.overrideAvailability),
          allowSameDay: Boolean(body.overrideAvailability),
        }
      );
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({ ok: true, appointment: result.appointment });
    }

    if (action === "closeout") {
      const outcome = body.outcome as VisitCloseStatus | undefined;
      if (!outcome) {
        return NextResponse.json({ error: "outcome is required" }, { status: 400 });
      }

      const paidRaw = body.paidAmountDollars;
      let paidAmountCents: number | undefined;
      if (paidRaw !== undefined && paidRaw !== null && paidRaw !== "") {
        const dollars = Number(paidRaw);
        if (!Number.isFinite(dollars) || dollars < 0) {
          return NextResponse.json({ error: "Invalid paid amount" }, { status: 400 });
        }
        paidAmountCents = Math.round(dollars * 100);
      }

      const input: GroomerVisitCloseoutInput = {
        outcome,
        firstName: body.firstName as string | undefined,
        lastName: body.lastName as string | undefined,
        petName: body.petName as string | undefined,
        groomNotes: body.groomNotes as string | undefined,
        paidAmountCents,
        paidVia: body.paidVia as AppointmentPaidVia | undefined,
      };

      const result = await closeGroomerVisit(id, user.groomerId!, user.email, input);
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
