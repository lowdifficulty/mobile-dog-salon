import { NextResponse } from "next/server";
import { requireClient } from "@/lib/payments/auth";
import { removeCardOnFile } from "@/lib/payments/square";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ cardId: string }> }
) {
  try {
    await requireClient();
    const { cardId } = await context.params;
    if (!cardId) {
      return NextResponse.json({ error: "Card id required" }, { status: 400 });
    }
    await removeCardOnFile(cardId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Remove card failed:", err);
    return NextResponse.json({ error: "Could not remove card" }, { status: 400 });
  }
}
