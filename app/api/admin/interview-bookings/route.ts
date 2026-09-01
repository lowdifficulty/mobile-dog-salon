import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import { listInterviewBookings } from "@/lib/interviews/store";

export async function GET() {
  try {
    await requireAdmin();
    const bookings = await listInterviewBookings();
    return NextResponse.json({
      bookings: bookings.map((booking) => ({
        ...booking,
        groomPhotos: undefined,
        photoCount: booking.groomPhotos?.length ?? 0,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
