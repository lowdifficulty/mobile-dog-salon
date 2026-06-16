import { NextResponse } from "next/server";
import { requireClient } from "@/lib/payments/auth";
import { findClientById } from "@/lib/payments/store";
import { listCustomerCards, saveCardOnFile } from "@/lib/payments/square";

export async function GET() {
  try {
    const user = await requireClient();
    const account = await findClientById(user.id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    const cards = await listCustomerCards(account.squareCustomerId);
    return NextResponse.json({ cards });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireClient();
    const account = await findClientById(user.id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const body = await request.json();
    const { sourceId, cardholderName } = body as { sourceId?: string; cardholderName?: string };
    if (!sourceId) {
      return NextResponse.json({ error: "Card token required" }, { status: 400 });
    }

    const card = await saveCardOnFile(
      account.squareCustomerId,
      sourceId,
      cardholderName ?? `${account.firstName} ${account.lastName}`
    );
    return NextResponse.json({ success: true, card });
  } catch (err) {
    console.error("Save card failed:", err);
    return NextResponse.json({ error: "Could not save card. Check card details and try again." }, { status: 400 });
  }
}
