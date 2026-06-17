import { NextResponse } from "next/server";
import { requireGroomer } from "@/lib/scheduling/auth";
import { readSchedulingData, writeSchedulingData } from "@/lib/scheduling/store";
import type { AvailabilityDay } from "@/lib/scheduling/types";

export async function GET() {
  try {
    const user = await requireGroomer();
    const data = await readSchedulingData();
    const mine = data.availability.filter((a) => a.groomerId === user.groomerId);
    return NextResponse.json({ availability: mine });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireGroomer();
    const body = await request.json();
    const incoming = (body.availability ?? []) as AvailabilityDay[];

    const sanitized = incoming
      .filter((a) => a.date && Array.isArray(a.times))
      .map((a) => ({
        groomerId: user.groomerId!,
        date: a.date,
        times: [...new Set(a.times)].sort(),
      }));

    const data = await readSchedulingData();
    data.availability = [
      ...data.availability.filter((a) => a.groomerId !== user.groomerId),
      ...sanitized,
    ];
    await writeSchedulingData(data);

    return NextResponse.json({ success: true, count: sanitized.length });
  } catch (err) {
    console.error("Save availability failed:", err);
    return NextResponse.json({ error: "Could not save availability" }, { status: 500 });
  }
}
