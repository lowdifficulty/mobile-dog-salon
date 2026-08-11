import "server-only";
import type { ClientAccount, PaymentHistoryItem, SavedCardSummary } from "./types";
import {
  createSquareCustomer,
  createCustomerPayment as createSquarePayment,
  isSquareConfigured,
  listCustomerCards as listSquareCards,
  listCustomerPayments as listSquarePayments,
  listRecentPayments as listRecentSquarePayments,
  removeCardOnFile as removeSquareCard,
  saveCardOnFile as saveSquareCard,
} from "./square";
import {
  createStripeCustomer,
  createCustomerPayment as createStripePayment,
  isStripeConfigured,
  listCustomerCards as listStripeCards,
  listCustomerPayments as listStripePayments,
  listRecentPayments as listRecentStripePayments,
  removeCardOnFile as removeStripeCard,
  saveCardOnFile as saveStripeCard,
} from "./stripe";
import { updateClient } from "./store";

export type PaymentProvider = "stripe" | "square" | "none";

function readForcedPaymentProvider(): PaymentProvider | null {
  const forced = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (forced === "stripe" || forced === "square") return forced;
  return null;
}

export function getPaymentProvider(): PaymentProvider {
  const forced = readForcedPaymentProvider();
  if (forced === "stripe" && isStripeConfigured()) return "stripe";
  if (forced === "square" && isSquareConfigured()) return "square";
  if (forced && !isStripeConfigured() && !isSquareConfigured()) return "none";
  if (isStripeConfigured()) return "stripe";
  if (isSquareConfigured()) return "square";
  return "none";
}

export function isPaymentsConfigured(): boolean {
  return getPaymentProvider() !== "none";
}

export async function getPaymentsPublicConfig() {
  const provider = getPaymentProvider();
  if (provider === "stripe") {
    const { getStripePublicConfig } = await import("./stripe");
    const stripe = getStripePublicConfig();
    return {
      provider,
      configured: stripe.configured,
      publishableKey: stripe.publishableKey,
    };
  }
  if (provider === "square") {
    const { getSquareClientConfig } = await import("./square");
    const square = await getSquareClientConfig();
    return {
      provider,
      configured: square.configured,
      applicationId: square.applicationId,
      locationId: square.locationId,
      environment: square.environment,
      locationConfigured: square.locationConfigured,
    };
  }
  return { provider: "none" as const, configured: false };
}

export function getClientPaymentCustomerId(account: ClientAccount): string {
  if (getPaymentProvider() === "stripe") {
    return account.stripeCustomerId || "";
  }
  return account.squareCustomerId || "";
}

export async function ensurePaymentCustomer(account: ClientAccount): Promise<string> {
  const provider = getPaymentProvider();
  if (provider === "none") {
    throw new Error("Payments are not configured");
  }

  const existing = getClientPaymentCustomerId(account);
  if (existing) return existing;

  if (provider === "stripe") {
    const stripeCustomerId = await createStripeCustomer({
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
      phone: account.phone,
    });
    await updateClient(account.id, { stripeCustomerId });
    return stripeCustomerId;
  }

  const squareCustomerId = await createSquareCustomer({
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    phone: account.phone,
  });
  await updateClient(account.id, { squareCustomerId });
  return squareCustomerId;
}

export async function listCustomerCards(account: ClientAccount): Promise<SavedCardSummary[]> {
  const customerId = await ensurePaymentCustomer(account);
  if (getPaymentProvider() === "stripe") {
    return listStripeCards(customerId);
  }
  return listSquareCards(customerId);
}

export async function saveCardOnFile(
  account: ClientAccount,
  sourceId: string,
  cardholderName?: string,
  postalCode?: string
): Promise<SavedCardSummary> {
  const customerId = await ensurePaymentCustomer(account);
  if (getPaymentProvider() === "stripe") {
    return saveStripeCard(customerId, sourceId, cardholderName, postalCode);
  }
  return saveSquareCard(customerId, sourceId, cardholderName);
}

export async function removeCardOnFile(cardId: string): Promise<void> {
  if (getPaymentProvider() === "stripe") {
    await removeStripeCard(cardId);
    return;
  }
  await removeSquareCard(cardId);
}

export async function createCustomerPayment(input: {
  account: ClientAccount;
  sourceId: string;
  amountCents: number;
  note?: string;
  savedCard?: boolean;
}): Promise<PaymentHistoryItem> {
  const customerId = await ensurePaymentCustomer(input.account);
  if (getPaymentProvider() === "stripe") {
    return createStripePayment({
      stripeCustomerId: customerId,
      sourceId: input.sourceId,
      amountCents: input.amountCents,
      note: input.note,
      savedCard: input.savedCard,
    });
  }
  return createSquarePayment({
    squareCustomerId: customerId,
    sourceId: input.sourceId,
    amountCents: input.amountCents,
    note: input.note,
  });
}

export async function listCustomerPayments(account: ClientAccount): Promise<PaymentHistoryItem[]> {
  const customerId = getClientPaymentCustomerId(account);
  if (!customerId) return [];
  if (getPaymentProvider() === "stripe") {
    return listStripePayments(customerId);
  }
  return listSquarePayments(customerId);
}

export async function listRecentPayments(limit = 50): Promise<PaymentHistoryItem[]> {
  if (getPaymentProvider() === "stripe") {
    return listRecentStripePayments(limit);
  }
  if (getPaymentProvider() === "square") {
    return listRecentSquarePayments(limit);
  }
  return [];
}

export async function createPaymentCustomerOnRegister(input: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<{ stripeCustomerId?: string; squareCustomerId?: string }> {
  const provider = getPaymentProvider();
  if (provider === "stripe") {
    return { stripeCustomerId: await createStripeCustomer(input) };
  }
  if (provider === "square") {
    return { squareCustomerId: await createSquareCustomer(input) };
  }
  return {};
}
