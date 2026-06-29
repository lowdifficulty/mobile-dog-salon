import { NextResponse } from "next/server";
import { ensureLeadForGroomerAppointment } from "@/lib/leads/appointment-lead";
import { addClientPhoto, clientPhotoUrl } from "@/lib/groomer/client-photos";
import { requireGroomer } from "@/lib/scheduling/auth";

export async function POST(request: Request) {
  try {
    const user = await requireGroomer();
    const form = await request.formData();
    const appointmentId = String(form.get("appointmentId") ?? "").trim();
    const petName = String(form.get("petName") ?? "");
    const caption = String(form.get("caption") ?? "");
    const file = form.get("file");

    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId required" }, { status: 400 });
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Photo file required" }, { status: 400 });
    }

    const ensured = await ensureLeadForGroomerAppointment(
      appointmentId,
      user.groomerId!
    );
    if (!ensured.ok) {
      return NextResponse.json({ error: ensured.error }, { status: ensured.status });
    }

    const result = await addClientPhoto(
      ensured.leadId,
      user.groomerId!,
      file,
      petName,
      caption
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      photo: {
        ...result.photo,
        url: clientPhotoUrl(result.photo.id),
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
