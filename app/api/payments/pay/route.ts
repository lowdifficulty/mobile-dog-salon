import { NextResponse } from "next/server";
import { requireClient } from "@/lib/payments/auth";
import { createCustomerPayment } from "@/lib/payments/gateway";
import { findClientById } from "@/lib/payments/store";

export async function POST(request: Request) {
  try {
    const user = await requireClient();
    const account = await findClientById(user.id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const body = await request.json();
    const { amountDollars, note, cardId, sourceId } = body as {
      amountDollars?: number | string;
      note?: string;
      cardId?: string;
      sourceId?: string;
    };

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
      account,
      sourceId: paymentSource,
      amountCents,
      note: note?.trim() || undefined,
      savedCard: Boolean(cardId),
    });

    return NextResponse.json({ success: true, payment });
  } catch (err) {
    console.error("Payment failed:", err);
    const message =
      err instanceof Error ? err.message : "Payment could not be processed. Please try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
