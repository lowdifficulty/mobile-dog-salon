import { normalizePhone } from "./normalize";
import { funnelStepOrder, type Lead, type LeadFunnelStep } from "./types";

export type LeadCrmView = "active" | "abandoned" | "scheduled" | "cold_storage";

export function hasValidLeadPhone(lead: Pick<Lead, "phone">): boolean {
  return normalizePhone(lead.phone ?? "").length >= 10;
}

export function hasSelectedAppointmentTime(lead: {
  funnelStep: LeadFunnelStep;
  appointmentStartAt?: string;
}): boolean {
  if (lead.appointmentStartAt) return true;
  return funnelStepOrder(lead.funnelStep) >= funnelStepOrder("schedule_appointment");
}

export function isScheduledLead(lead: {
  funnelStep: LeadFunnelStep;
  appointmentStartAt?: string;
}): boolean {
  if (!lead.appointmentStartAt) return false;
  if (funnelStepOrder(lead.funnelStep) < funnelStepOrder("scheduled")) return false;
  return new Date(lead.appointmentStartAt) >= new Date();
}

/** Picked a slot but did not complete booking — may still have address without phone. */
export function isAbandonedLead(lead: {
  funnelStep: LeadFunnelStep;
  appointmentStartAt?: string;
}): boolean {
  if (isScheduledLead(lead)) return false;
  return hasSelectedAppointmentTime(lead);
}

export function withLeadDefaults(lead: Lead): Lead {
  return {
    ...lead,
    followUpMode: lead.followUpMode ?? "fu",
    listStatus: lead.listStatus ?? "active",
  };
}

export function leadMatchesCrmView(lead: Lead, view: LeadCrmView): boolean {
  const normalized = withLeadDefaults(lead);
  if (!hasValidLeadPhone(normalized)) return false;

  if (view === "cold_storage") {
    return normalized.listStatus === "cold_storage";
  }

  if (normalized.listStatus !== "active") return false;

  const scheduled = isScheduledLead(normalized);
  const abandoned = isAbandonedLead(normalized);

  if (view === "scheduled") return scheduled;
  if (view === "abandoned") return abandoned;
  return hasValidLeadPhone(normalized) && !scheduled && !abandoned;
}

export function leadsForAnalytics(leads: Lead[]): Lead[] {
  return leads.map(withLeadDefaults);
}
