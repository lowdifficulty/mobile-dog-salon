import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/scheduling/auth";
import { findClientById } from "@/lib/payments/store";
import { createCustomerPayment } from "@/lib/payments/square";

export async function POST(request: Request) {
  try {
    await requireStaff();
    const body = await request.json();
    const { clientId, amountDollars, note, cardId, sourceId } = body as {
      clientId?: string;
      amountDollars?: number | string;
      note?: string;
      cardId?: string;
      sourceId?: string;
    };

    if (!clientId) {
      return NextResponse.json({ error: "Select a client" }, { status: 400 });
    }

    const account = await findClientById(clientId);
    if (!account) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const amount = Number(amountDollars);
    if (!Number.isFinite(amount) || amount < 1 || amount > 10000) {
      return NextResponse.json({ error: "Enter an amount between $1 and $10,000" }, { status: 400 });
    }

    const paymentSource = cardId || sourceId;
    if (!paymentSource) {
      return NextResponse.json({ error: "Select a saved card or enter a new card" }, { status: 400 });
    }

    const amountCents = Math.round(amount * 100);
    const payment = await createCustomerPayment({
      squareCustomerId: account.squareCustomerId,
      sourceId: paymentSource,
      amountCents,
      note: note?.trim() || undefined,
    });

    return NextResponse.json({
      success: true,
      payment: {
        ...payment,
        clientName: `${account.firstName} ${account.lastName}`,
        clientEmail: account.email,
      },
    });
  } catch (err) {
    console.error("Staff payment failed:", err);
    return NextResponse.json({ error: "Payment could not be processed" }, { status: 400 });
  }
}
