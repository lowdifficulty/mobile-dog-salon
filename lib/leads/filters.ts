import { normalizePhone } from "./normalize";
import type { Lead, LeadFollowUpMode, LeadListStatus } from "./types";

export function hasValidLeadPhone(lead: Pick<Lead, "phone">): boolean {
  return normalizePhone(lead.phone ?? "").length >= 10;
}

export function withLeadDefaults(lead: Lead): Lead {
  return {
    ...lead,
    followUpMode: lead.followUpMode ?? "fu",
    listStatus: lead.listStatus ?? "active",
  };
}

export function leadMatchesCrmView(
  lead: Lead,
  view: LeadListStatus
): boolean {
  const normalized = withLeadDefaults(lead);
  if (!hasValidLeadPhone(normalized)) return false;
  return normalized.listStatus === view;
}

export function leadsForAnalytics(leads: Lead[]): Lead[] {
  return leads.map(withLeadDefaults);
}
