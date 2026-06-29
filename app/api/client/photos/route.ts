import { NextResponse } from "next/server";
import { ensureLeadForClientAccount } from "@/lib/client/lead-link";
import { clientPortalPhotoUrl, addClientPortalPhoto } from "@/lib/groomer/client-photos";
import { requireClient } from "@/lib/payments/auth";
import { findClientById } from "@/lib/payments/store";
import { readSchedulingData } from "@/lib/scheduling/store";

export async function GET() {
  try {
    const sessionUser = await requireClient();
    const account = await findClientById(sessionUser.id);
    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const lead = await ensureLeadForClientAccount(account);
    const photos = (lead.photos ?? []).map((photo) => ({
      ...photo,
      url: clientPortalPhotoUrl(photo.id),
    }));

    return NextResponse.json({ photos });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await requireClient();
    const account = await findClientById(sessionUser.id);
    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const form = await request.formData();
    const file = form.get("file");
    const petName = String(form.get("petName") ?? "");
    const caption = String(form.get("caption") ?? "");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Photo file required" }, { status: 400 });
    }

    const lead = await ensureLeadForClientAccount(account);
    const { appointments } = await readSchedulingData();
    const ap =
      appointments.find((a) => a.id === lead.appointmentId) ??
      appointments.find(
        (a) =>
          a.status === "confirmed" &&
          a.phone.replace(/\D/g, "") === account.phone.replace(/\D/g, "")
      );

    const groomerId = ap?.groomerId ?? "melanie";

    const result = await addClientPortalPhoto(
      account.id,
      lead.id,
      groomerId,
      file,
      petName,
      caption
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      photo: { ...result.photo, url: clientPortalPhotoUrl(result.photo.id) },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
