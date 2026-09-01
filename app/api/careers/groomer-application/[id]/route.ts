import { NextResponse } from "next/server";
import {
  addGroomPhotosToBooking,
  completeInterviewApplication,
  getInterviewBookingById,
} from "@/lib/interviews/store";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const booking = await getInterviewBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const body = await request.json();
    const updated = await addGroomPhotosToBooking(id, body.photos);

    return NextResponse.json({
      success: true,
      applicationId: updated.id,
      photoCount: updated.groomPhotos?.length ?? 0,
      applicationStatus: updated.applicationStatus ?? "booked",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not upload photos";
    const status =
      message.includes("Please") || message.includes("must") || message.includes("Photos")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const booking = await getInterviewBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const updated = await completeInterviewApplication(id);

    return NextResponse.json({
      success: true,
      applicationId: updated.id,
      applicationStatus: updated.applicationStatus,
      completedAt: updated.completedAt,
      photoCount: updated.groomPhotos?.length ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not complete application";
    const status = message.includes("Please") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
