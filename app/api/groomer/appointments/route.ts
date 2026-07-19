import { NextResponse } from "next/server";
import { requireGroomer } from "@/lib/scheduling/auth";
import {
  filterStaffAppointments,
  type StaffAppointmentFilter,
} from "@/lib/scheduling/appointment-filters";
import { readSchedulingData } from "@/lib/scheduling/store";

function parseFilter(value: string | null): StaffAppointmentFilter {
  if (value === "past" || value === "all") return value;
  return "upcoming";
}

export async function GET(request: Request) {
  try {
    const user = await requireGroomer();
    const { searchParams } = new URL(request.url);
    const filter = parseFilter(searchParams.get("filter"));
    const now = new Date();

    const data = await readSchedulingData();
    let list = data.appointments.filter((a) => a.groomerId === user.groomerId);
    list = filterStaffAppointments(list, filter, now);

    return NextResponse.json({ appointments: list });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
