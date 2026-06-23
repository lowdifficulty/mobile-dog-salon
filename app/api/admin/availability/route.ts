import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/scheduling/auth";
import { readSchedulingData } from "@/lib/scheduling/store";
import type { GroomerId } from "@/lib/scheduling/types";

export async function GET(request: Request) {
  try {
    await requireStaff();
    const { searchParams } = new URL(request.url);
    const groomerId = searchParams.get("groomerId") as GroomerId | null;

    const data = await readSchedulingData();
    let list = data.availability;
    if (groomerId) list = list.filter((a) => a.groomerId === groomerId);

    return NextResponse.json({ availability: list });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
