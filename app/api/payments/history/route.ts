import { NextResponse } from "next/server";
import { requireClient } from "@/lib/payments/auth";
import { listCustomerPayments } from "@/lib/payments/gateway";
import { findClientById } from "@/lib/payments/store";

export async function GET() {
  try {
    const user = await requireClient();
    const account = await findClientById(user.id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    const payments = await listCustomerPayments(account);
    return NextResponse.json({ payments });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
