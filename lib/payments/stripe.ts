import "server-only";
import Stripe from "stripe";
import type { PaymentHistoryItem, SavedCardSummary } from "./types";

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      (process.env.STRIPE_PUBLISHABLE_KEY?.trim() ||
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim())
  );
}

export function getStripePublishableKey(): string {
  return (
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
    process.env.STRIPE_PUBLISHABLE_KEY?.trim() ||
    ""
  );
}

export function getStripePublicConfig() {
  return {
    publishableKey: getStripePublishableKey(),
    configured: isStripeConfigured(),
  };
}

function getStripeClient(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    throw new Error("Stripe is not configured");
  }
  return new Stripe(secret);
}

export async function createStripeCustomer(input: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<string> {
  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: input.email,
    name: `${input.firstName} ${input.lastName}`.trim(),
    phone: input.phone,
    metadata: {
      source: "mobile-dog-salon",
    },
  });
  if (!customer.id) {
    throw new Error("Stripe did not return a customer id");
  }
  return customer.id;
}

function mapStripePaymentMethod(pm: Stripe.PaymentMethod): SavedCardSummary {
  return {
    id: pm.id,
    brand: pm.card?.brand,
    last4: pm.card?.last4,
    expMonth: pm.card?.exp_month,
    expYear: pm.card?.exp_year,
    cardholderName: pm.billing_details.name ?? undefined,
  };
}

export async function listCustomerCards(stripeCustomerId: string): Promise<SavedCardSummary[]> {
  if (!stripeCustomerId) return [];
  const stripe = getStripeClient();
  const page = await stripe.paymentMethods.list({
    customer: stripeCustomerId,
    type: "card",
  });
  return page.data.map(mapStripePaymentMethod);
}

export async function saveCardOnFile(
  stripeCustomerId: string,
  paymentMethodId: string,
  cardholderName?: string,
  postalCode?: string
): Promise<SavedCardSummary> {
  const stripe = getStripeClient();
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: stripeCustomerId,
  });
  const billingDetails: Stripe.PaymentMethodUpdateParams["billing_details"] = {};
  if (cardholderName?.trim()) billingDetails.name = cardholderName.trim();
  if (postalCode?.trim()) {
    billingDetails.address = { postal_code: postalCode.trim() };
  }
  if (Object.keys(billingDetails).length > 0) {
    await stripe.paymentMethods.update(paymentMethodId, { billing_details: billingDetails });
  }
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  return mapStripePaymentMethod(pm);
}

export async function removeCardOnFile(paymentMethodId: string): Promise<void> {
  const stripe = getStripeClient();
  await stripe.paymentMethods.detach(paymentMethodId);
}

export async function createCustomerPayment(input: {
  stripeCustomerId: string;
  sourceId: string;
  amountCents: number;
  note?: string;
  savedCard?: boolean;
}): Promise<PaymentHistoryItem> {
  const stripe = getStripeClient();
  const intent = await stripe.paymentIntents.create({
    amount: input.amountCents,
    currency: "usd",
    customer: input.stripeCustomerId,
    payment_method: input.sourceId,
    confirm: true,
    off_session: Boolean(input.savedCard),
    metadata: input.note ? { note: input.note.slice(0, 500) } : undefined,
    description: input.note?.slice(0, 500) || undefined,
  });

  if (intent.status !== "succeeded" && intent.status !== "processing") {
    throw new Error(intent.last_payment_error?.message || "Payment failed");
  }

  return mapPaymentIntent(intent);
}

export async function listCustomerPayments(
  stripeCustomerId: string
): Promise<PaymentHistoryItem[]> {
  if (!stripeCustomerId) return [];
  const stripe = getStripeClient();
  const page = await stripe.paymentIntents.list({
    customer: stripeCustomerId,
    limit: 100,
  });
  return page.data
    .filter((intent) => intent.status === "succeeded" || intent.status === "processing")
    .map(mapPaymentIntent);
}

export async function listRecentPayments(limit = 50): Promise<PaymentHistoryItem[]> {
  const stripe = getStripeClient();
  const page = await stripe.paymentIntents.list({ limit });
  return page.data
    .filter((intent) => intent.status === "succeeded" || intent.status === "processing")
    .slice(0, limit)
    .map(mapPaymentIntent);
}

export async function getStripeAccountStatus(): Promise<{
  ok: boolean;
  livemode?: boolean;
  currency?: string;
  error?: string;
}> {
  try {
    const stripe = getStripeClient();
    const balance = await stripe.balance.retrieve();
    return {
      ok: true,
      livemode: balance.livemode,
      currency: balance.available[0]?.currency ?? "usd",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Stripe connection failed",
    };
  }
}

function mapPaymentIntent(intent: Stripe.PaymentIntent): PaymentHistoryItem {
  const pm =
    typeof intent.payment_method === "string"
      ? null
      : intent.payment_method;
  return {
    id: intent.id,
    amountCents: intent.amount,
    currency: intent.currency.toUpperCase(),
    status: intent.status ?? "UNKNOWN",
    createdAt: new Date(intent.created * 1000).toISOString(),
    note: intent.metadata?.note || intent.description || undefined,
    cardBrand: pm?.card?.brand,
    cardLast4: pm?.card?.last4,
    customerId:
      typeof intent.customer === "string" ? intent.customer : intent.customer?.id,
  };
}
