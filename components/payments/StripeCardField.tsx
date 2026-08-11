"use client";

import { useEffect, useRef, useState } from "react";
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe, type StripeCardElement } from "@stripe/stripe-js";

export type PaymentCardBillingDetails = {
  cardholderName?: string;
  postalCode?: string;
};

export type PaymentCardInstance = {
  tokenize: (
    billing?: PaymentCardBillingDetails
  ) => Promise<{ status: string; token?: string; errors?: Array<{ message: string }> }>;
};

function StripeCardInput({
  onReady,
  disabled,
}: {
  onReady: (card: PaymentCardInstance | null) => void;
  disabled?: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const cardRef = useRef<StripeCardElement | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    if (!stripe || !elements) {
      onReadyRef.current(null);
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      onReadyRef.current(null);
      return;
    }

    cardRef.current = card;
    onReadyRef.current({
      tokenize: async (billing) => {
        const { error, paymentMethod } = await stripe.createPaymentMethod({
          type: "card",
          card,
          billing_details: {
            name: billing?.cardholderName?.trim() || undefined,
            address: billing?.postalCode?.trim()
              ? { postal_code: billing.postalCode.trim() }
              : undefined,
          },
        });
        if (error || !paymentMethod) {
          return {
            status: "FAILED",
            errors: [{ message: error?.message ?? "Could not read card." }],
          };
        }
        return { status: "OK", token: paymentMethod.id };
      },
    });

    return () => {
      onReadyRef.current(null);
    };
  }, [elements, stripe]);

  return (
    <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
      <CardElement
        options={{
          style: {
            base: {
              fontSize: "16px",
              color: "#1f2937",
              "::placeholder": { color: "#9ca3af" },
            },
            invalid: { color: "#dc2626" },
          },
        }}
      />
    </div>
  );
}

export default function StripeCardField({
  publishableKey,
  onReady,
  disabled = false,
}: {
  publishableKey: string;
  onReady: (card: PaymentCardInstance | null) => void;
  disabled?: boolean;
}) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!publishableKey) {
      setError("Stripe publishable key is missing.");
      onReady(null);
      return;
    }
    setStripePromise(loadStripe(publishableKey));
  }, [onReady, publishableKey]);

  if (error) {
    return <p className="text-sm text-red-600 mb-2">{error}</p>;
  }

  if (!stripePromise) {
    return <p className="text-sm text-gray-500 mb-2">Loading secure card form…</p>;
  }

  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-[52px] border border-gray-200 rounded-xl bg-white px-3 py-3">
        <StripeCardInput onReady={onReady} disabled={disabled} />
      </div>
    </Elements>
  );
}
