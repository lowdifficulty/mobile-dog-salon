import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import { listInterviewBookings } from "@/lib/interviews/store";

export async function GET() {
  try {
    await requireAdmin();
    const bookings = await listInterviewBookings();
    return NextResponse.json({ bookings });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
