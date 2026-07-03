import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/scheduling/auth";
import {
  filterStaffAppointments,
  type StaffAppointmentFilter,
} from "@/lib/scheduling/appointment-filters";
import { readSchedulingData } from "@/lib/scheduling/store";
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
