import { NextResponse } from "next/server";
import { ensureContactFromAppointment, ensureContactForPhone } from "@/lib/crm/messaging";
import { findAppointmentByShortCode } from "@/lib/scheduling/appointment-short-link";
import { readSchedulingData } from "@/lib/scheduling/store";
import { requireStaff } from "@/lib/scheduling/auth";

export async function GET(request: Request) {
  try {
    await requireStaff();
    const params = new URL(request.url).searchParams;
    const appointmentId = params.get("appointmentId")?.trim();
    const code = params.get("code")?.trim().toLowerCase();
    const phone = params.get("phone")?.trim();

    if (!appointmentId && !code && !phone) {
      return NextResponse.json({ error: "appointmentId, code, or phone required" }, { status: 400 });
    }

    if (phone) {
      const contact = await ensureContactForPhone(phone);
      return NextResponse.json({ contactId: contact.id });
    }

    let appointment = null;
    if (code) {
      appointment = await findAppointmentByShortCode(code);
    } else if (appointmentId) {
      const { appointments } = await readSchedulingData();
      appointment = appointments.find((ap) => ap.id === appointmentId) ?? null;
    }

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const contact = await ensureContactFromAppointment(appointment);
    return NextResponse.json({ contactId: contact.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not open conversation";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
