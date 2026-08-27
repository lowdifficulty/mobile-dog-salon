import { NextResponse } from "next/server";
import { requireGroomer } from "@/lib/scheduling/auth";
import {
  filterStaffAppointments,
  parseStaffAppointmentFilter,
} from "@/lib/scheduling/appointment-filters";
import { groomerSeesTeamAppointments } from "@/lib/scheduling/groomers";
import { readSchedulingData } from "@/lib/scheduling/store";
import { listTooFarAppointments } from "@/lib/scheduling/too-far-appointments";

export async function GET(request: Request) {
  try {
    const user = await requireGroomer();
    const { searchParams } = new URL(request.url);
    const filterParam = searchParams.get("filter");
    const now = new Date();

    const data = await readSchedulingData();
    let list = data.appointments;
    const scopedToGroomer = !groomerSeesTeamAppointments(user.groomerId!);
    if (scopedToGroomer) {
      list = list.filter((a) => a.groomerId === user.groomerId);
    }

    if (filterParam === "tooFar") {
      const { routes, isolated, tooFar, meta } = listTooFarAppointments(list, {
        groomerId: scopedToGroomer ? user.groomerId! : undefined,
        now,
      });
      return NextResponse.json({ routes, isolated, tooFar, meta });
    }

    const filter = parseStaffAppointmentFilter(filterParam);
    list = filterStaffAppointments(list, filter, now);

    return NextResponse.json({ appointments: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Groomer appointments GET failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
