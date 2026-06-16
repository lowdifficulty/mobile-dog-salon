import "server-only";
import { readClientsData } from "./store";
import type { PaymentHistoryItem } from "./types";

export async function enrichPaymentsWithClients(
  payments: PaymentHistoryItem[]
): Promise<PaymentHistoryItem[]> {
  const data = await readClientsData();
  const bySquareId = new Map(
    data.clients.map((c) => [
      c.squareCustomerId,
      { name: `${c.firstName} ${c.lastName}`, email: c.email },
    ])
  );

  return payments.map((payment) => {
    if (!payment.customerId) return payment;
    const client = bySquareId.get(payment.customerId);
    if (!client) return payment;
    return {
      ...payment,
      clientName: client.name,
      clientEmail: client.email,
    };
  });
}
