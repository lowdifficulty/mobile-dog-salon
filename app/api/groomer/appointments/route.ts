import { NextResponse } from "next/server";
import { requireGroomer } from "@/lib/scheduling/auth";
import { readSchedulingData } from "@/lib/scheduling/store";

export async function GET(request: Request) {
  try {
    const user = await requireGroomer();
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") ?? "upcoming";
    const now = new Date();

    const data = await readSchedulingData();
    let list =
      filter === "upcoming"
        ? data.appointments
        : data.appointments.filter((a) => a.groomerId === user.groomerId);

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
