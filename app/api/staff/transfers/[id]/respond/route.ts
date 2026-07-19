import { NextResponse } from "next/server";
import { requireGroomer } from "@/lib/scheduling/auth";
import {
  applyAcceptedTransfer,
  revertDeclinedAppointmentTransfer,
} from "@/lib/staff/apply-transfer";
import { getTransferById, resolveTransfer } from "@/lib/staff/transfers";
import { readSchedulingData } from "@/lib/scheduling/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireGroomer();
    const { id } = await context.params;
    const body = (await request.json()) as { accept?: boolean };

    if (body.accept !== true && body.accept !== false) {
      return NextResponse.json({ error: "accept must be true or false" }, { status: 400 });
    }

    const existing = await getTransferById(id);
    if (!existing || existing.toGroomerId !== user.groomerId) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }
    if (existing.status !== "pending") {
      return NextResponse.json({ error: "Transfer already resolved" }, { status: 409 });
    }

    if (body.accept) {
      if (existing.type === "appointment" && existing.appointmentId && existing.fromGroomerId) {
        const data = await readSchedulingData();
        const appointment = data.appointments.find((a) => a.id === existing.appointmentId);
        if (appointment?.groomerId === existing.fromGroomerId) {
          const applied = await applyAcceptedTransfer(existing);
          if (!applied.ok) {
            return NextResponse.json({ error: applied.error }, { status: 409 });
          }
        }
      } else if (existing.type !== "appointment") {
        const applied = await applyAcceptedTransfer(existing);
        if (!applied.ok) {
          return NextResponse.json({ error: applied.error }, { status: 409 });
        }
      }
    } else if (existing.type === "appointment") {
      const reverted = await revertDeclinedAppointmentTransfer(existing);
      if (!reverted.ok) {
        return NextResponse.json({ error: reverted.error }, { status: 409 });
      }
    }

    const transfer = await resolveTransfer(id, user.groomerId!, body.accept);
    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    return NextResponse.json({ transfer });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
