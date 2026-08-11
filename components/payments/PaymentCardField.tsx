"use client";

import { useEffect, useState } from "react";
import SquareCardField from "./SquareCardField";
import StripeCardField, {
  type PaymentCardBillingDetails,
  type PaymentCardInstance,
} from "./StripeCardField";

type PaymentConfig = {
  configured?: boolean;
  provider?: "stripe" | "square" | "none";
  publishableKey?: string;
};

export type { PaymentCardBillingDetails, PaymentCardInstance };

export default function PaymentCardField({
  onReady,
  disabled = false,
}: {
  onReady: (card: PaymentCardInstance | null) => void;
  disabled?: boolean;
}) {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/payments/config")
      .then((r) => r.json())
      .then((data: PaymentConfig) => setConfig(data))
      .catch(() => {
        setError("Could not load payment configuration.");
        onReady(null);
      });
  }, [onReady]);

  if (error) {
    return <p className="text-sm text-red-600 mb-2">{error}</p>;
  }

  if (!config) {
    return <p className="text-sm text-gray-500 mb-2">Loading secure card form…</p>;
  }

  if (!config.configured) {
    return (
      <p className="text-sm text-amber-800 mb-2">
        Online payments are not configured yet.
      </p>
    );
  }

  if (config.provider === "stripe" && config.publishableKey) {
    return (
      <StripeCardField
        publishableKey={config.publishableKey}
        onReady={onReady}
        disabled={disabled}
      />
    );
  }

  return <SquareCardField onReady={onReady} disabled={disabled} />;
}
