import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import {
  deleteInterviewBooking,
  updateInterviewBookingOutcome,
} from "@/lib/interviews/store";
import type { InterviewOutcome } from "@/lib/interviews/types";

function parseOutcome(value: unknown): InterviewOutcome | undefined {
  if (value === "continue" || value === "declined") return value;
  if (value === null || value === "") return undefined;
  return undefined;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = (await request.json()) as { outcome?: unknown };
    const updated = await updateInterviewBookingOutcome(id, parseOutcome(body.outcome));
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ booking: updated });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const deleted = await deleteInterviewBooking(id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
