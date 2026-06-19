import { normalizePhone } from "./normalize";
import { funnelStepOrder, type Lead, type LeadFunnelStep } from "./types";

export type LeadCrmView = "active" | "scheduled" | "cold_storage";

export function hasValidLeadPhone(lead: Pick<Lead, "phone">): boolean {
  return normalizePhone(lead.phone ?? "").length >= 10;
}

export function isScheduledLead(lead: {
  funnelStep: LeadFunnelStep;
  appointmentStartAt?: string;
}): boolean {
  if (!lead.appointmentStartAt) return false;
  if (funnelStepOrder(lead.funnelStep) < funnelStepOrder("scheduled")) return false;
  return new Date(lead.appointmentStartAt) >= new Date();
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
  if (view === "scheduled") return scheduled;
  return !scheduled;
}

export function leadsForAnalytics(leads: Lead[]): Lead[] {
  return leads.map(withLeadDefaults);
}
