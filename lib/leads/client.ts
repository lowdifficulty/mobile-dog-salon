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
  source?: "booking" | "contact";
}

export async function saveLead(payload: SaveLeadPayload): Promise<void> {
  trackMetaLeadIfConversion(payload.funnelStep, payload.source ?? "booking");

  try {
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        leadSessionId: getLeadSessionId(),
      }),
    });
  } catch {
    // Non-blocking — booking flow should continue if CRM save fails
  }
}
