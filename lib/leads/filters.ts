import { normalizePhone } from "./normalize";
import { funnelStepOrder, type Lead, type LeadFunnelStep } from "./types";

export type LeadCrmView = "abandoned" | "scheduled" | "complete" | "cold_storage";

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
  lastAppointmentAt?: string;
}): boolean {
  if (isScheduledLead(lead)) return false;
  if (isCompletedVisitLead(lead)) return false;
  return hasSelectedAppointmentTime(lead);
}

export function isCompletedVisitLead(lead: {
  funnelStep: LeadFunnelStep;
  lastAppointmentAt?: string;
}): boolean {
  return lead.funnelStep === "appointment_completed" && Boolean(lead.lastAppointmentAt);
}

export function withLeadDefaults(lead: Lead): Lead {
  return {
    ...lead,
    followUpMode: lead.followUpMode ?? "fu",
    visitOutcome: lead.visitOutcome ?? "incomplete",
    listStatus: lead.listStatus ?? "active",
  };
}

/** Non-scheduled, non-completed leads — former Active + Abandoned lists combined. */
export function isInAbandonedCrmView(lead: Lead): boolean {
  const normalized = withLeadDefaults(lead);
  if (normalized.listStatus !== "active") return false;
  if (isScheduledLead(normalized)) return false;
  if (isCompletedVisitLead(normalized)) return false;
  if (hasValidLeadPhone(normalized)) return true;
  return hasSelectedAppointmentTime(normalized);
}

export function leadMatchesCrmView(lead: Lead, view: LeadCrmView): boolean {
  const normalized = withLeadDefaults(lead);

  if (view === "cold_storage") {
    return normalized.listStatus === "cold_storage";
  }

  if (normalized.listStatus !== "active") return false;

  if (view === "scheduled") {
    return isScheduledLead(normalized) && hasValidLeadPhone(normalized);
  }
  if (view === "complete") {
    return hasValidLeadPhone(normalized) && isCompletedVisitLead(normalized);
  }
  if (view === "abandoned") {
    return isInAbandonedCrmView(normalized);
  }
  return false;
}

export function leadsForAnalytics(leads: Lead[]): Lead[] {
  return leads.map(withLeadDefaults);
}
