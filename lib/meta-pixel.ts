import type { LeadFunnelStep } from "@/lib/leads/types";
import { funnelStepOrder } from "@/lib/leads/types";

export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "1849998219140925";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

function fbq(...args: unknown[]) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq(...args);
}

/** Custom event for each CRM funnel step (build audiences & funnels in Meta). */
export function trackMetaFunnelStep(
  step: LeadFunnelStep,
  source: "booking" | "contact" = "booking"
) {
  fbq("trackCustom", "LeadFunnelStep", {
    funnel_step: step,
    funnel_step_order: funnelStepOrder(step),
    source,
  });
}

/** Standard Meta Lead event — booking completed or contact form submitted. */
export function trackMetaLead(
  step: LeadFunnelStep,
  source: "booking" | "contact" = "booking"
) {
  fbq("track", "Lead", {
    content_name: step,
    funnel_step: step,
    source,
  });
}

export function trackMetaLeadIfConversion(
  step: LeadFunnelStep,
  source: "booking" | "contact" = "booking"
) {
  trackMetaFunnelStep(step, source);
  if (step === "scheduled" || (step === "contact_info" && source === "contact") || (step === "contact_details" && source === "contact")) {
    trackMetaLead(step, source);
  }
}
