import { NextResponse } from "next/server";
import { listAppointmentsByPhone } from "@/lib/client/my-appointment";
import {
  clearMyAppointmentPhone,
  getMyAppointmentPhone,
  isValidLookupPhone,
  setMyAppointmentPhone,
} from "@/lib/client/my-appointment-session";
import { formatPhoneDisplay } from "@/lib/leads/normalize";

export async function GET() {
  try {
    const phone = await getMyAppointmentPhone();
    if (!phone) {
      return NextResponse.json({ error: "Phone not verified" }, { status: 401 });
    }

    const appointments = await listAppointmentsByPhone(phone);
    return NextResponse.json({
      phoneDisplay: formatPhoneDisplay(phone),
      appointments,
    });
  } catch {
    return NextResponse.json({ error: "Could not load appointments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: string };
    const phone = body.phone?.trim() ?? "";
    if (!isValidLookupPhone(phone)) {
      return NextResponse.json(
        { error: "Enter the 10-digit mobile number used when you booked." },
        { status: 400 }
      );
    }

    const normalized = await setMyAppointmentPhone(phone);
    const appointments = await listAppointmentsByPhone(normalized);

    return NextResponse.json({
      phoneDisplay: formatPhoneDisplay(normalized),
      appointments,
    });
  } catch {
    return NextResponse.json({ error: "Could not look up appointments" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearMyAppointmentPhone();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Could not clear session" }, { status: 500 });
  }
}
