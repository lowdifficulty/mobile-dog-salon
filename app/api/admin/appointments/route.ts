import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/scheduling/auth";
import {
  filterStaffAppointments,
  parseStaffAppointmentFilter,
} from "@/lib/scheduling/appointment-filters";
import { readSchedulingData } from "@/lib/scheduling/store";
import { listTooFarAppointments } from "@/lib/scheduling/too-far-appointments";
import type { GroomerId } from "@/lib/scheduling/types";

export async function GET(request: Request) {
  try {
    await requireStaff();
    const { searchParams } = new URL(request.url);
    const groomerId = searchParams.get("groomerId") as GroomerId | null;
    const filterParam = searchParams.get("filter");
    const now = new Date();

    const data = await readSchedulingData();
    let list = data.appointments;
    if (groomerId) list = list.filter((a) => a.groomerId === groomerId);

    if (filterParam === "tooFar") {
      const { tooFar, meta } = listTooFarAppointments(list, {
        groomerId: groomerId ?? undefined,
        now,
      });
      return NextResponse.json({ tooFar, meta });
    }

    const filter = parseStaffAppointmentFilter(filterParam);
    list = filterStaffAppointments(list, filter, now);

    return NextResponse.json({ appointments: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Admin appointments GET failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
