import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/scheduling/auth";
import {
  filterStaffAppointments,
  type StaffAppointmentFilter,
} from "@/lib/scheduling/appointment-filters";
import { readSchedulingData } from "@/lib/scheduling/store";
import {
  createAppointment,
  type CreateAppointmentInput,
} from "@/lib/scheduling/appointment-actions";
import { runBookingFollowUp } from "@/lib/scheduling/booking-follow-up";
import type { GroomerId } from "@/lib/scheduling/types";

function parseFilter(value: string | null): StaffAppointmentFilter {
  if (value === "past" || value === "all") return value;
  return "upcoming";
}

export async function GET(request: Request) {
  try {
    await requireStaff();
    const { searchParams } = new URL(request.url);
    const groomerId = searchParams.get("groomerId") as GroomerId | null;
    const filter = parseFilter(searchParams.get("filter"));
    const now = new Date();

    const data = await readSchedulingData();
    let list = data.appointments;
    if (groomerId) list = list.filter((a) => a.groomerId === groomerId);

    list = filterStaffAppointments(list, filter, now);

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
