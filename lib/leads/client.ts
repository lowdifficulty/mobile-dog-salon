"use client";

import type { LeadFunnelStep } from "@/lib/leads/types";
import { trackMetaLeadIfConversion } from "@/lib/meta-pixel";

const SESSION_KEY = "mds_lead_session_id";

export function getLeadSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `lead-${Date.now()}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export interface SaveLeadPayload {
  funnelStep: LeadFunnelStep;
  phone?: string;
  email?: string;
  fullName?: string;
  petName?: string;
  petSize?: string;
  pets?: { petName: string; petSize: string }[];
  service?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  discountActive?: boolean;
  discountSkipped?: boolean;
  smsOptIn?: boolean;
  appointmentId?: string;
  scheduledAt?: string;
  appointmentStartAt?: string;
  groomerId?: string;
  groomerName?: string;
  message?: string;
  source?: "booking" | "booking-hb" | "booking-oc" | "contact" | "franchise";
  /** USD value sent to Meta only (not stored in CRM). */
  metaConversionValue?: number;
}

export async function saveLead(payload: SaveLeadPayload): Promise<void> {
  const { metaConversionValue, ...crmPayload } = payload;
  trackMetaLeadIfConversion(crmPayload.funnelStep, crmPayload.source ?? "booking", {
    appointmentId: crmPayload.appointmentId,
    groomerId: crmPayload.groomerId,
    service: crmPayload.service,
    value: metaConversionValue,
  });

  try {
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...crmPayload,
        leadSessionId: getLeadSessionId(),
      }),
    });
  } catch {
    // Non-blocking — booking flow should continue if CRM save fails
  }
}

export async function pingLeadActivity(): Promise<void> {
  try {
    await fetch("/api/leads/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadSessionId: getLeadSessionId() }),
    });
  } catch {
    // Non-blocking
  }
}
