import { NextResponse } from "next/server";
import { getAppointmentBookedPrice } from "@/lib/booking/appointment-title";
import {
  ensureClientForAppointment,
  formatAppointmentPaymentNote,
} from "@/lib/payments/appointment-client";
import {
  createCustomerPayment,
  isPaymentsConfigured,
  saveCardOnFile,
} from "@/lib/payments/gateway";
import { requireStaff } from "@/lib/scheduling/auth";
import { readSchedulingData } from "@/lib/scheduling/store";

export async function GET(request: Request) {
  try {
    await requireStaff();
    const appointmentId = new URL(request.url).searchParams.get("appointmentId");
    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId required" }, { status: 400 });
    }

    const { appointments } = await readSchedulingData();
    const appointment = appointments.find((a) => a.id === appointmentId);
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const serviceDollars = getAppointmentBookedPrice(appointment);
    return NextResponse.json({
      appointmentId: appointment.id,
      serviceDollars,
      clientName: `${appointment.firstName} ${appointment.lastName}`.trim(),
      phone: appointment.phone,
      petName: appointment.petName,
      startAt: appointment.startAt,
      status: appointment.status,
      paymentsConfigured: isPaymentsConfigured(),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireStaff();
    if (!isPaymentsConfigured()) {
      return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
    }

    const body = await request.json();
    const {
      appointmentId,
      sourceId,
      cardholderName,
      postalCode,
      tipDollars,
    } = body as {
      appointmentId?: string;
      sourceId?: string;
      cardholderName?: string;
      postalCode?: string;
      tipDollars?: number | string;
    };

    if (!appointmentId || !sourceId) {
      return NextResponse.json(
        { error: "appointmentId and card details are required" },
        { status: 400 }
      );
    }

    const { appointments } = await readSchedulingData();
    const appointment = appointments.find((a) => a.id === appointmentId);
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    if (appointment.status === "cancelled") {
      return NextResponse.json({ error: "Cannot pay for a cancelled appointment" }, { status: 400 });
    }

    const serviceDollars = getAppointmentBookedPrice(appointment);
    if (serviceDollars == null) {
      return NextResponse.json({ error: "Could not determine appointment price" }, { status: 400 });
    }

    const tip = Number(tipDollars);
    const tipAmount = Number.isFinite(tip) && tip >= 0 ? tip : 0;
    if (tipAmount > 10000) {
      return NextResponse.json({ error: "Tip is too large" }, { status: 400 });
    }

    const totalDollars = serviceDollars + tipAmount;
    const amountCents = Math.round(totalDollars * 100);
    if (amountCents < 100) {
      return NextResponse.json({ error: "Total must be at least $1" }, { status: 400 });
    }

    const account = await ensureClientForAppointment(appointment);
    const name =
      cardholderName?.trim() || `${appointment.firstName} ${appointment.lastName}`.trim();

    const savedCard = await saveCardOnFile(account, sourceId, name, postalCode?.trim());
    const note = formatAppointmentPaymentNote({
      appointment,
      serviceDollars,
      tipDollars: tipAmount,
    });

    const payment = await createCustomerPayment({
      account,
      sourceId: savedCard.id,
      amountCents,
      note,
      savedCard: true,
    });

    return NextResponse.json({
      success: true,
      payment: {
        ...payment,
        clientName: `${account.firstName} ${account.lastName}`,
        clientEmail: account.email,
        serviceDollars,
        tipDollars: tipAmount,
        totalDollars,
      },
      cardSaved: true,
      clientId: account.id,
    });
  } catch (err) {
    console.error("Appointment payment failed:", err);
    const message = err instanceof Error ? err.message : "Payment could not be processed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
