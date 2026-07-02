import type { LeadFunnelStep } from "@/lib/leads/types";
import { funnelStepOrder } from "@/lib/leads/types";

export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "1849998219140925";

export type MetaLeadSource =
  | "booking"
  | "booking-hb"
  | "booking-oc"
  | "contact"
  | "franchise";

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

/** Start loading Meta Pixel early (booking form open, etc.). */
export function warmMetaPixel(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("mds:warm-meta-pixel"));
}

function isBookingLeadSource(source: MetaLeadSource): boolean {
  return source === "booking" || source === "booking-hb" || source === "booking-oc";
}

function territoryFromSource(source: MetaLeadSource): string | undefined {
  if (source === "booking-hb") return "la";
  if (source === "booking-oc") return "oc";
  return undefined;
}

export interface MetaConversionOptions {
  appointmentId?: string;
  groomerId?: string;
  service?: string;
  value?: number;
}

function eventOptions(appointmentId?: string) {
  return appointmentId ? { eventID: appointmentId } : undefined;
}

function bookingEventParams(
  source: MetaLeadSource,
  options: MetaConversionOptions,
  step: LeadFunnelStep
) {
  const territory = territoryFromSource(source);
  return {
    content_name: options.service ?? step,
    content_category: source,
    funnel_step: step,
    source,
    ...(territory ? { territory } : {}),
    ...(options.groomerId ? { groomer_id: options.groomerId } : {}),
    ...(options.value != null ? { value: options.value, currency: "USD" } : {}),
  };
}

/** Appointment booked — Lead + Schedule for Meta ad optimization. */
export function trackMetaAppointmentBooked(
  source: MetaLeadSource,
  options: MetaConversionOptions & { appointmentId: string }
) {
  warmMetaPixel();
  const params = bookingEventParams(source, options, "scheduled");
  const dedupe = eventOptions(options.appointmentId);

  fbq("track", "Lead", params, dedupe);
  fbq(
    "track",
    "Schedule",
    {
      ...params,
      value: options.value ?? 0,
      currency: "USD",
    },
    dedupe
  );
  fbq("trackCustom", "BookingScheduled", params, dedupe);
}

/** Custom event for each CRM funnel step (build audiences & funnels in Meta). */
export function trackMetaFunnelStep(
  step: LeadFunnelStep,
  source: MetaLeadSource = "booking"
) {
  fbq("trackCustom", "LeadFunnelStep", {
    funnel_step: step,
    funnel_step_order: funnelStepOrder(step),
    source,
    ...(territoryFromSource(source)
      ? { territory: territoryFromSource(source) }
      : {}),
  });
}

/** Standard Meta Lead event — address entered or contact form submitted. */
export function trackMetaLead(
  step: LeadFunnelStep,
  source: MetaLeadSource = "booking",
  options?: MetaConversionOptions
) {
  fbq(
    "track",
    "Lead",
    bookingEventParams(source, options ?? {}, step),
    eventOptions(options?.appointmentId)
  );
}

export function trackMetaLeadIfConversion(
  step: LeadFunnelStep,
  source: MetaLeadSource = "booking",
  options?: MetaConversionOptions
) {
  trackMetaFunnelStep(step, source);
  if (source === "franchise") return;

  if (
    step === "scheduled" &&
    isBookingLeadSource(source) &&
    options?.appointmentId
  ) {
    trackMetaAppointmentBooked(source, {
      ...options,
      appointmentId: options.appointmentId,
    });
    return;
  }

  const isBookingLead = isBookingLeadSource(source) && step === "address";
  const isContactLead =
    source === "contact" &&
    (step === "contact_info" || step === "contact_details");
  if (isBookingLead || isContactLead) {
    trackMetaLead(step, source, options);
  }
}
