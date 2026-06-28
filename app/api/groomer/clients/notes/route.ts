import { NextResponse } from "next/server";
import { addNoteForAppointment } from "@/lib/leads/appointment-lead";
import { requireGroomer } from "@/lib/scheduling/auth";

export async function POST(request: Request) {
  try {
    const user = await requireGroomer();
    const body = await request.json();
    const appointmentId = String(body.appointmentId ?? "").trim();
    const text = String(body.text ?? "").trim();

    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId required" }, { status: 400 });
    }

    const result = await addNoteForAppointment(
      appointmentId,
      text,
      user.groomerId!
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ lead: result.lead });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
