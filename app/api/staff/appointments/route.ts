import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/scheduling/auth";
import { readSchedulingData } from "@/lib/scheduling/store";
import {
  createAppointment,
  type CreateAppointmentInput,
} from "@/lib/scheduling/appointment-actions";
import { runBookingFollowUp } from "@/lib/scheduling/booking-follow-up";
import type { GroomerId } from "@/lib/scheduling/types";

export async function GET(request: Request) {
  try {
    await requireStaff();
    const { searchParams } = new URL(request.url);
    const groomerId = searchParams.get("groomerId") as GroomerId | null;
    const filter = searchParams.get("filter") ?? "upcoming";
    const now = new Date();

    const data = await readSchedulingData();
    let list = data.appointments;
    if (groomerId) list = list.filter((a) => a.groomerId === groomerId);

    if (filter === "upcoming") {
      list = list.filter((a) => new Date(a.startAt) >= now && a.status === "confirmed");
      list.sort((a, b) => a.startAt.localeCompare(b.startAt));
    } else {
      list = list.filter((a) => new Date(a.startAt) < now || a.status === "cancelled");
      list.sort((a, b) => b.startAt.localeCompare(a.startAt));
    }

    return NextResponse.json({ appointments: list });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStaff();
    const body = (await request.json()) as CreateAppointmentInput & {
      overrideAvailability?: boolean;
    };

    const groomerOptions =
      user.role === "groomer" && user.groomerId
        ? { groomerId: user.groomerId }
        : undefined;

    const result = await createAppointment(body, user.email, {
      ...groomerOptions,
      overrideAvailability: body.overrideAvailability ?? true,
      allowSameDay: true,
      skipHold: true,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await runBookingFollowUp(result.appointment, "staff");

    return NextResponse.json({
      ok: true,
      appointment: result.appointment,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
