"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { META_PIXEL_ID } from "@/lib/meta-pixel";

function installFbqStub() {
  if (typeof window === "undefined" || window.fbq) return;

  const queue: unknown[][] = [];
  const stub = (...args: unknown[]) => {
    queue.push(args);
  };
  (stub as { queue?: unknown[][] }).queue = queue;
  window.fbq = stub;
  window._fbq = stub;
}

/**
 * Queues Meta Pixel events immediately, but loads fbevents.js only after
 * user interaction to avoid third-party cookies and main-thread work on passive views.
 */
export default function DeferredMetaPixel() {
  const [loadScript, setLoadScript] = useState(false);

  useEffect(() => {
    if (!META_PIXEL_ID) return;

    installFbqStub();

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

  if (!META_PIXEL_ID || !loadScript) return null;

  return (
    <Script id="meta-pixel" strategy="lazyOnload">
      {`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');
      `}
    </Script>
  );
}
