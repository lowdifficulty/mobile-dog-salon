import "server-only";
import { bookingDurationMinutesForGroomer } from "@/lib/scheduling/groomers";
import { isStaffUpcomingAppointment } from "@/lib/scheduling/appointment-filters";
import { readSchedulingData } from "@/lib/scheduling/store";
import { GROOMERS } from "@/lib/scheduling/groomers";
import { REBOOK_3W_MS } from "@/lib/notifications/appointment-format";
import { readLeadsData } from "@/lib/leads/store";
import { funnelStepOrder } from "@/lib/leads/types";
import { hasValidLeadPhone } from "@/lib/leads/filters";
import type { Appointment } from "@/lib/scheduling/types";
import type { Lead } from "@/lib/leads/types";
import type { MassSmsCampaignKind, MassSmsEligibleContact } from "./types";
import { currentCampaignWeek, phonesSentThisWeek, readMassSmsCampaign } from "./store";

function normalizePhoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

function appointmentEndMs(appointment: Appointment, now: Date): number {
  const duration =
    appointment.durationMinutes ?? bookingDurationMinutesForGroomer(appointment.groomerId);
  return new Date(appointment.startAt).getTime() + duration * 60 * 1000;
}

function isCompletedVisit(appointment: Appointment, now: Date): boolean {
  if (appointment.status !== "confirmed") return false;
  return appointmentEndMs(appointment, now) <= now.getTime();
}

function hasValidSmsPhone(appointment: Appointment): boolean {
  const key = normalizePhoneKey(appointment.phone);
  return key.length >= 10 && appointment.smsOptIn;
}

function leadHasSmsOptIn(lead: Lead): boolean {
  return lead.smsOptIn !== false;
}

function leadPetName(lead: Lead): string {
  if (lead.petName?.trim()) return lead.petName.trim();
  const first = lead.pets?.[0]?.petName?.trim();
  return first ?? "";
}

function buildUpcomingPhoneSet(appointments: Appointment[], now: Date): Set<string> {
  const upcomingByPhone = new Set<string>();
  for (const appt of appointments) {
    if (appt.status !== "confirmed") continue;
    if (!isStaffUpcomingAppointment(appt, now)) continue;
    upcomingByPhone.add(normalizePhoneKey(appt.phone));
  }
  return upcomingByPhone;
}

function buildCompletedPhoneSet(appointments: Appointment[], now: Date): Set<string> {
  const completed = new Set<string>();
  for (const appt of appointments) {
    if (!hasValidSmsPhone(appt)) continue;
    if (!isCompletedVisit(appt, now)) continue;
    completed.add(normalizePhoneKey(appt.phone));
  }
  return completed;
}

export async function listRebookEligibleContacts(
  now = new Date()
): Promise<MassSmsEligibleContact[]> {
  const data = await readSchedulingData();
  const campaign = await readMassSmsCampaign("rebook");
  const sentThisWeek = phonesSentThisWeek(campaign);
  const sentAtByPhone = new Map(
    campaign.sent.map((r) => [r.phoneKey, r.sentAt] as const)
  );

  const upcomingByPhone = buildUpcomingPhoneSet(data.appointments, now);
  const lastVisitByPhone = new Map<string, Appointment>();

  for (const appt of data.appointments) {
    if (!hasValidSmsPhone(appt)) continue;
    if (!isCompletedVisit(appt, now)) continue;

    const phoneKey = normalizePhoneKey(appt.phone);
    const endMs = appointmentEndMs(appt, now);
    const existing = lastVisitByPhone.get(phoneKey);
    if (!existing || endMs > appointmentEndMs(existing, now)) {
      lastVisitByPhone.set(phoneKey, appt);
    }
  }

  const eligible: MassSmsEligibleContact[] = [];

  for (const [phoneKey, appt] of lastVisitByPhone) {
    if (upcomingByPhone.has(phoneKey)) continue;

    const endMs = appointmentEndMs(appt, now);
    const daysSince = Math.floor((now.getTime() - endMs) / (24 * 60 * 60 * 1000));
    if (now.getTime() - endMs < REBOOK_3W_MS) continue;

    eligible.push({
      phoneKey,
      phone: appt.phone,
      firstName: appt.firstName,
      lastName: appt.lastName,
      petName: appt.petName,
      lastVisitAt: new Date(endMs).toISOString(),
      lastVisitAppointmentId: appt.id,
      daysSinceVisit: daysSince,
      groomerName: GROOMERS[appt.groomerId].name,
      sentThisWeek: sentThisWeek.has(phoneKey),
      sentAt: sentAtByPhone.get(phoneKey),
    });
  }

  eligible.sort((a, b) => (b.daysSinceVisit ?? 0) - (a.daysSinceVisit ?? 0));
  return eligible;
}

function isNeverBookedLead(lead: Lead): boolean {
  if (lead.listStatus === "cold_storage") return false;
  if (funnelStepOrder(lead.funnelStep) >= funnelStepOrder("scheduled")) return false;
  if (lead.appointmentId) return false;
  return true;
}

export async function listLeadNurtureEligibleContacts(
  now = new Date()
): Promise<MassSmsEligibleContact[]> {
  const [{ leads }, { appointments }] = await Promise.all([
    readLeadsData(),
    readSchedulingData(),
  ]);
  const campaign = await readMassSmsCampaign("lead-nurture");
  const sentThisWeek = phonesSentThisWeek(campaign);
  const sentAtByPhone = new Map(
    campaign.sent.map((r) => [r.phoneKey, r.sentAt] as const)
  );

  const upcomingByPhone = buildUpcomingPhoneSet(appointments, now);
  const completedByPhone = buildCompletedPhoneSet(appointments, now);
  const seenPhones = new Set<string>();
  const eligible: MassSmsEligibleContact[] = [];

  for (const lead of leads) {
    if (!isNeverBookedLead(lead)) continue;
    if (!hasValidLeadPhone(lead)) continue;
    if (!leadHasSmsOptIn(lead)) continue;

    const phoneKey = normalizePhoneKey(lead.phone);
    if (phoneKey.length < 10) continue;
    if (seenPhones.has(phoneKey)) continue;
    if (upcomingByPhone.has(phoneKey)) continue;
    if (completedByPhone.has(phoneKey)) continue;

    seenPhones.add(phoneKey);

    const contactAt = lead.contactMadeAt || lead.createdAt;
    const daysSinceContact = Math.floor(
      (now.getTime() - new Date(contactAt).getTime()) / (24 * 60 * 60 * 1000)
    );

    eligible.push({
      phoneKey,
      phone: lead.phone,
      firstName: lead.firstName ?? "",
      lastName: lead.lastName ?? "",
      petName: leadPetName(lead),
      leadId: lead.id,
      funnelStep: lead.funnelStep,
      daysSinceContact,
      sentThisWeek: sentThisWeek.has(phoneKey),
      sentAt: sentAtByPhone.get(phoneKey),
    });
  }

  eligible.sort((a, b) => (b.daysSinceContact ?? 0) - (a.daysSinceContact ?? 0));
  return eligible;
}

export async function listMassSmsEligibleContacts(
  kind: MassSmsCampaignKind = "rebook",
  now = new Date()
): Promise<MassSmsEligibleContact[]> {
  return kind === "lead-nurture"
    ? listLeadNurtureEligibleContacts(now)
    : listRebookEligibleContacts(now);
}

export async function getMassSmsStatus(kind: MassSmsCampaignKind = "rebook", now = new Date()) {
  const eligible = await listMassSmsEligibleContacts(kind, now);
  const campaign = await readMassSmsCampaign(kind);
  const { massRebookSmsPreview, massLeadNurtureSmsPreview } = await import("./message");

  const pending = eligible.filter((c) => !c.sentThisWeek);

  return {
    kind,
    campaignWeek: currentCampaignWeek(now),
    eligibleCount: eligible.length,
    pendingCount: pending.length,
    sentThisWeekCount: eligible.filter((c) => c.sentThisWeek).length,
    lastBatchAt: campaign.lastBatchAt,
    messagePreview:
      kind === "lead-nurture" ? massLeadNurtureSmsPreview() : massRebookSmsPreview(),
  };
}
