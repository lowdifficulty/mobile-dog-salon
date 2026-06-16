import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import { readSchedulingData } from "@/lib/scheduling/store";
import type { GroomerId } from "@/lib/scheduling/types";

export async function GET(request: Request) {
  try {
    await requireAdmin();
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
