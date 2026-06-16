import "server-only";
import { randomUUID } from "crypto";
import { SquareClient, SquareEnvironment } from "square";
import type { Payment } from "square";
import type { PaymentHistoryItem, SavedCardSummary } from "./types";

export function isSquareConfigured(): boolean {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_APPLICATION_ID);
}

export function getSquarePublicConfig() {
  const applicationId = process.env.SQUARE_APPLICATION_ID ?? "";
  const locationId = process.env.SQUARE_LOCATION_ID?.trim() ?? "";
  const environment =
    process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";
  return {
    applicationId,
    locationId,
    environment,
    configured: isSquareConfigured(),
    locationConfigured: Boolean(locationId),
  };
}

export async function getSquareClientConfig() {
  const base = getSquarePublicConfig();
  if (!base.locationId && base.configured) {
    try {
      const locationId = await resolveLocationId();
      return { ...base, locationId, locationConfigured: true };
    } catch {
      return base;
    }
  }
  return base;
}

function getSquareClient(): SquareClient {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Square is not configured");
  }
  const environment =
    process.env.SQUARE_ENVIRONMENT === "production"
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox;

  return new SquareClient({ token, environment });
}

let cachedLocationId: string | null = null;

async function resolveLocationId(): Promise<string> {
  const fromEnv = process.env.SQUARE_LOCATION_ID?.trim();
  if (fromEnv) return fromEnv;
  if (cachedLocationId) return cachedLocationId;

  const client = getSquareClient();
  const response = await client.locations.list();
  const locations = response.locations ?? [];
  for (const location of locations) {
    if (location.id && (location.status === "ACTIVE" || !location.status)) {
      cachedLocationId = location.id;
      return location.id;
    }
  }
  throw new Error("No active Square location found. Set SQUARE_LOCATION_ID.");
}

export async function createSquareCustomer(input: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<string> {
  const client = getSquareClient();
  const response = await client.customers.create({
    emailAddress: input.email,
    givenName: input.firstName,
    familyName: input.lastName,
    phoneNumber: input.phone,
    referenceId: `mds-client-${randomUUID()}`,
  });
  const customerId = response.customer?.id;
  if (!customerId) {
    throw new Error("Square did not return a customer id");
  }
  return customerId;
}

export async function listCustomerCards(squareCustomerId: string): Promise<SavedCardSummary[]> {
  const client = getSquareClient();
  const page = await client.cards.list({ customerId: squareCustomerId });
  const cards: SavedCardSummary[] = [];
  for await (const card of page) {
    if (!card.id) continue;
    cards.push({
      id: card.id,
      brand: card.cardBrand ?? undefined,
      last4: card.last4 ?? undefined,
      expMonth: card.expMonth != null ? Number(card.expMonth) : undefined,
      expYear: card.expYear != null ? Number(card.expYear) : undefined,
      cardholderName: card.cardholderName ?? undefined,
    });
  }
  return cards;
}

export async function saveCardOnFile(
  squareCustomerId: string,
  sourceId: string,
  cardholderName?: string
): Promise<SavedCardSummary> {
  const client = getSquareClient();
  const response = await client.cards.create({
    idempotencyKey: randomUUID(),
    sourceId,
    card: {
      customerId: squareCustomerId,
      cardholderName,
    },
  });
  const card = response.card;
  if (!card?.id) {
    throw new Error("Could not save card");
  }
  return {
    id: card.id,
    brand: card.cardBrand ?? undefined,
    last4: card.last4 ?? undefined,
    expMonth: card.expMonth != null ? Number(card.expMonth) : undefined,
    expYear: card.expYear != null ? Number(card.expYear) : undefined,
    cardholderName: card.cardholderName ?? undefined,
  };
}

export async function removeCardOnFile(cardId: string): Promise<void> {
  const client = getSquareClient();
  await client.cards.disable({ cardId });
}

export async function createCustomerPayment(input: {
  squareCustomerId: string;
  sourceId: string;
  amountCents: number;
  note?: string;
}): Promise<PaymentHistoryItem> {
  const client = getSquareClient();
  const locationId = await resolveLocationId();

  const response = await client.payments.create({
    idempotencyKey: randomUUID(),
    sourceId: input.sourceId,
    customerId: input.squareCustomerId,
    locationId,
    amountMoney: {
      amount: BigInt(input.amountCents),
      currency: "USD",
    },
    note: input.note?.slice(0, 500) || undefined,
    autocomplete: true,
  });

  const payment = response.payment;
  if (!payment?.id) {
    throw new Error("Payment failed");
  }

  return mapPayment(payment);
}

export async function listCustomerPayments(squareCustomerId: string): Promise<PaymentHistoryItem[]> {
  const client = getSquareClient();
  const page = await client.payments.list({ sortOrder: "DESC", limit: 100 });
  const payments: PaymentHistoryItem[] = [];
  for await (const payment of page) {
    if (payment.customerId !== squareCustomerId) continue;
    payments.push(mapPayment(payment));
  }
  return payments;
}

export async function listRecentPayments(limit = 50): Promise<PaymentHistoryItem[]> {
  const client = getSquareClient();
  const page = await client.payments.list({ sortOrder: "DESC", limit });
  const payments: PaymentHistoryItem[] = [];
  for await (const payment of page) {
    payments.push(mapPayment(payment));
  }
  return payments;
}

function mapPayment(payment: Payment): PaymentHistoryItem {
  const amountCents = payment.amountMoney?.amount ? Number(payment.amountMoney.amount) : 0;
  return {
    id: payment.id ?? randomUUID(),
    amountCents,
    currency: payment.amountMoney?.currency ?? "USD",
    status: payment.status ?? "UNKNOWN",
    createdAt: payment.createdAt ?? new Date().toISOString(),
    note: payment.note ?? undefined,
    cardBrand: payment.cardDetails?.card?.cardBrand ?? undefined,
    cardLast4: payment.cardDetails?.card?.last4 ?? undefined,
    customerId: payment.customerId ?? undefined,
  };
}
