import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/scheduling/auth";
import { findClientById } from "@/lib/payments/store";
import { listCustomerCards, saveCardOnFile } from "@/lib/payments/square";

export async function GET(request: Request) {
  try {
    await requireStaff();
    const clientId = new URL(request.url).searchParams.get("clientId");
    if (!clientId) {
      return NextResponse.json({ error: "clientId required" }, { status: 400 });
    }

    const account = await findClientById(clientId);
    if (!account) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const cards = await listCustomerCards(account.squareCustomerId);
    return NextResponse.json({ cards });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireStaff();
    const body = await request.json();
    const { clientId, sourceId, cardholderName } = body as {
      clientId?: string;
      sourceId?: string;
      cardholderName?: string;
    };

    if (!clientId || !sourceId) {
      return NextResponse.json({ error: "clientId and sourceId required" }, { status: 400 });
    }

    const account = await findClientById(clientId);
    if (!account) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const card = await saveCardOnFile(
      account.squareCustomerId,
      sourceId,
      cardholderName ?? `${account.firstName} ${account.lastName}`
    );
    return NextResponse.json({ success: true, card });
  } catch (err) {
    console.error("Staff save card failed:", err);
    return NextResponse.json({ error: "Could not save card" }, { status: 400 });
  }
}
