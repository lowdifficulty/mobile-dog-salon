"use client";

import { useEffect, useRef, useState } from "react";

type SquareCardInstance = {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: Array<{ message: string }> }>;
  destroy?: () => Promise<void>;
};

export default function SquareCardField({
  onReady,
  disabled = false,
}: {
  onReady: (card: SquareCardInstance | null) => void;
  disabled?: boolean;
}) {
  const containerId = useRef(`sq-card-${Math.random().toString(36).slice(2)}`);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    let card: SquareCardInstance | null = null;
    let script: HTMLScriptElement | null = null;

    async function init() {
      try {
        const configRes = await fetch("/api/payments/config");
        const config = await configRes.json();
        if (!config.configured) {
          setError("Square payments are not configured on this site yet.");
          onReadyRef.current(null);
          setLoading(false);
          return;
        }

        const scriptUrl =
          config.environment === "production"
            ? "https://web.squarecdn.com/v1/square.js"
            : "https://sandbox.web.squarecdn.com/v1/square.js";

        script = document.createElement("script");
        script.src = scriptUrl;
        script.async = true;
        script.onload = async () => {
          try {
            if (!window.Square) throw new Error("Square SDK failed to load");
            const payments = await window.Square.payments(config.applicationId, config.locationId);
            card = await payments.card();
            await card.attach(`#${containerId.current}`);
            onReadyRef.current(card);
            setLoading(false);
          } catch (err) {
            console.error(err);
            setError("Could not load card form.");
            onReadyRef.current(null);
            setLoading(false);
          }
        };
        script.onerror = () => {
          setError("Could not load Square payment form.");
          onReadyRef.current(null);
          setLoading(false);
        };
        document.body.appendChild(script);
      } catch {
        setError("Could not load payment configuration.");
        onReadyRef.current(null);
        setLoading(false);
      }
    }

    init();

    return () => {
      if (card?.destroy) card.destroy().catch(() => undefined);
      if (script?.parentNode) script.parentNode.removeChild(script);
      onReadyRef.current(null);
    };
  }, []);

  return (
    <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
      {loading && <p className="text-sm text-gray-500 mb-2">Loading secure card form…</p>}
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div
        id={containerId.current}
        className="min-h-[52px] border border-gray-200 rounded-xl bg-white px-3 py-2"
      />
    </div>
  );
}
