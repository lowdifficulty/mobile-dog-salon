"use client";

import { useEffect, useRef } from "react";
import { META_PIXEL_ID } from "@/lib/meta-pixel";

const WARM_EVENT = "mds:warm-meta-pixel";
const SCRIPT_ID = "meta-fbevents";

/** Facebook's queue stub — events before fbevents.js loads are retained. */
function installMetaPixelStub() {
  if (typeof window === "undefined" || window.fbq) return;

  const fbq = function (...args: unknown[]) {
    const fn = fbq as FbqStub;
    if (fn.callMethod) {
      fn.callMethod(...args);
    } else {
      fn.queue.push(args);
    }
  } as FbqStub;

  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.push = fbq;
  window.fbq = fbq;
  window._fbq = fbq;
}

type FbqStub = ((...args: unknown[]) => void) & {
  queue: unknown[][];
  loaded: boolean;
  version: string;
  push: FbqStub;
  callMethod?: (...args: unknown[]) => void;
};

function loadFbeventsScript() {
  if (typeof document === "undefined" || document.getElementById(SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
}

function activateMetaPixel() {
  if (!META_PIXEL_ID || typeof window === "undefined") return;
  installMetaPixelStub();
  loadFbeventsScript();
  window.fbq?.("init", META_PIXEL_ID);
  window.fbq?.("track", "PageView");
}

/**
 * Queues Meta Pixel events immediately, but loads fbevents.js only after
 * user interaction (or booking form open) to avoid third-party work on passive views.
 */
export default function DeferredMetaPixel() {
  const activated = useRef(false);

  useEffect(() => {
    if (!META_PIXEL_ID) return;

    installMetaPixelStub();

    const enable = () => {
      if (activated.current) return;
      activated.current = true;
      activateMetaPixel();
    };

    window.addEventListener(WARM_EVENT, enable);

    const events = ["pointerdown", "keydown", "touchstart"] as const;
    for (const event of events) {
      window.addEventListener(event, enable, { once: true, passive: true });
    }

    return () => {
      window.removeEventListener(WARM_EVENT, enable);
      for (const event of events) {
        window.removeEventListener(event, enable);
      }
    };
  }, []);

  return null;
}
