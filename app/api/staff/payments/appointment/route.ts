import { NextResponse } from "next/server";
import { getAppointmentBookedPrice } from "@/lib/booking/appointment-title";
import {
  ensureClientForAppointment,
  formatAppointmentPaymentNote,
} from "@/lib/payments/appointment-client";
import {
  createCustomerPayment,
  isPaymentsConfigured,
  listCustomerCards,
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
    const paymentsConfigured = isPaymentsConfigured();

    let clientId: string | undefined;
    let savedCards: Awaited<ReturnType<typeof listCustomerCards>> = [];

    if (paymentsConfigured) {
      try {
        const account = await ensureClientForAppointment(appointment);
        clientId = account.id;
        savedCards = await listCustomerCards(account);
      } catch (err) {
        console.error("Appointment payment client lookup failed:", err);
      }
    }

    return NextResponse.json({
      appointmentId: appointment.id,
      serviceDollars,
      clientName: `${appointment.firstName} ${appointment.lastName}`.trim(),
      phone: appointment.phone,
      petName: appointment.petName,
      startAt: appointment.startAt,
      status: appointment.status,
      paymentsConfigured,
      clientId,
      savedCards,
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
      cardId,
      cardholderName,
      postalCode,
      serviceDollars: serviceDollarsInput,
      tipDollars,
    } = body as {
      appointmentId?: string;
      sourceId?: string;
      cardId?: string;
      cardholderName?: string;
      postalCode?: string;
      serviceDollars?: number | string;
      tipDollars?: number | string;
    };

    if (!appointmentId || (!sourceId && !cardId)) {
      return NextResponse.json(
        { error: "appointmentId and a saved card or new card details are required" },
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

    const quotedServiceDollars = getAppointmentBookedPrice(appointment);
    if (quotedServiceDollars == null) {
      return NextResponse.json({ error: "Could not determine appointment price" }, { status: 400 });
    }

    const service =
      serviceDollarsInput != null && serviceDollarsInput !== ""
        ? Number(serviceDollarsInput)
        : quotedServiceDollars;
    if (!Number.isFinite(service) || service < 1 || service > 10000) {
      return NextResponse.json(
        { error: "Service amount must be between $1 and $10,000" },
        { status: 400 }
      );
    }
    const serviceDollars = service;

    const tip = Number(tipDollars);
    const tipAmount = Number.isFinite(tip) && tip >= 0 ? tip : 0;
    if (tipAmount > 10000) {
      return NextResponse.json({ error: "Tip is too large" }, { status: 400 });
    }

    const totalDollars = serviceDollars + tipAmount;
    const amountCents = Math.round(totalDollars * 100);
    if (amountCents < 100 || totalDollars > 10000) {
      return NextResponse.json({ error: "Total must be between $1 and $10,000" }, { status: 400 });
    }

    const account = await ensureClientForAppointment(appointment);
    const note = formatAppointmentPaymentNote({
      appointment,
      serviceDollars,
      tipDollars: tipAmount,
    });

    let paymentSourceId: string;
    let cardSaved = false;

    if (cardId) {
      const cards = await listCustomerCards(account);
      if (!cards.some((card) => card.id === cardId)) {
        return NextResponse.json({ error: "Saved card not found for this client" }, { status: 400 });
      }
      paymentSourceId = cardId;
    } else {
      if (!cardholderName?.trim()) {
        return NextResponse.json({ error: "Enter the name on the card." }, { status: 400 });
      }
      const savedCard = await saveCardOnFile(
        account,
        sourceId!,
        cardholderName.trim(),
        postalCode?.trim()
      );
      paymentSourceId = savedCard.id;
      cardSaved = true;
    }

    const payment = await createCustomerPayment({
      account,
      sourceId: paymentSourceId,
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
      cardSaved,
      clientId: account.id,
    });
  } catch (err) {
    console.error("Appointment payment failed:", err);
    const message = err instanceof Error ? err.message : "Payment could not be processed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
