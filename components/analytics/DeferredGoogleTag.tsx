"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { GA_MEASUREMENT_ID } from "@/lib/google-analytics";

function installGtagStub() {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
  }
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Loads Google Tag after interaction so it does not block the main thread on first paint. */
export default function DeferredGoogleTag() {
  const [loadScript, setLoadScript] = useState(false);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    installGtagStub();

    const enable = () => setLoadScript(true);
    const events = ["pointerdown", "keydown", "touchstart"] as const;

    for (const event of events) {
      window.addEventListener(event, enable, { once: true, passive: true });
    }

    return () => {
      for (const event of events) {
        window.removeEventListener(event, enable);
      }
    };
  }, []);

  if (!GA_MEASUREMENT_ID || !loadScript) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="lazyOnload"
      />
      <Script id="google-tag" strategy="lazyOnload">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
