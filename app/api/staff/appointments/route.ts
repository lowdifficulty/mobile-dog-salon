import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/scheduling/auth";
import {
  filterStaffAppointments,
  type StaffAppointmentFilter,
} from "@/lib/scheduling/appointment-filters";
import { readSchedulingData } from "@/lib/scheduling/store";
import {
  createRecurringAppointments,
  type CreateAppointmentInput,
} from "@/lib/scheduling/appointment-actions";
import { runBookingFollowUp } from "@/lib/scheduling/booking-follow-up";
import { isStaffRecurrenceFrequency } from "@/lib/scheduling/recurring-appointments";
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
      recurrence?: string;
    };

    const groomerOptions =
      user.role === "groomer" && user.groomerId
        ? { groomerId: user.groomerId }
        : undefined;

    const mutationOptions = {
      ...groomerOptions,
      overrideAvailability: body.overrideAvailability ?? true,
      allowSameDay: true,
      skipHold: true,
    };

    const recurrence = isStaffRecurrenceFrequency(body.recurrence)
      ? body.recurrence
      : "none";

    const result = await createRecurringAppointments(
      body,
      user.email,
      recurrence,
      mutationOptions
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    for (let i = 0; i < result.appointments.length; i++) {
      await runBookingFollowUp(result.appointments[i], "staff", {
        quiet: i > 0,
      });
    }

    return NextResponse.json({
      ok: true,
      appointment: result.appointments[0],
      appointments: result.appointments,
      bookedCount: result.appointments.length,
      skipped: result.skipped,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
