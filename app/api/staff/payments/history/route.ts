import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/scheduling/auth";
import { findClientById } from "@/lib/payments/store";
import { enrichPaymentsWithClients } from "@/lib/payments/staff";
import { listCustomerPayments, listRecentPayments } from "@/lib/payments/square";

export async function GET(request: Request) {
  try {
    await requireStaff();
    const clientId = new URL(request.url).searchParams.get("clientId");

    if (clientId) {
      const account = await findClientById(clientId);
      if (!account) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
      const payments = await listCustomerPayments(account.squareCustomerId);
      return NextResponse.json({
        payments: payments.map((p) => ({
          ...p,
          clientName: `${account.firstName} ${account.lastName}`,
          clientEmail: account.email,
        })),
      });
    }

    const payments = await enrichPaymentsWithClients(await listRecentPayments(50));
    return NextResponse.json({ payments });
  } catch (err) {
    console.error("Staff payment history failed:", err);
    return NextResponse.json({ error: "Could not load payments" }, { status: 500 });
  }
}
