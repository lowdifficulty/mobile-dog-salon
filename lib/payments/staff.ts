import "server-only";
import { readClientsData } from "./store";
import type { PaymentHistoryItem } from "./types";

export async function enrichPaymentsWithClients(
  payments: PaymentHistoryItem[]
): Promise<PaymentHistoryItem[]> {
  const data = await readClientsData();
  const byCustomerId = new Map<string, { name: string; email: string }>();
  for (const client of data.clients) {
    const info = { name: `${client.firstName} ${client.lastName}`, email: client.email };
    if (client.stripeCustomerId) byCustomerId.set(client.stripeCustomerId, info);
    if (client.squareCustomerId) byCustomerId.set(client.squareCustomerId, info);
  }

  return payments.map((payment) => {
    if (!payment.customerId) return payment;
    const client = byCustomerId.get(payment.customerId);
    if (!client) return payment;
    return {
      ...payment,
      clientName: client.name,
      clientEmail: client.email,
    };
  });
}
