import "server-only";
import { bookingDurationMinutesForGroomer } from "@/lib/scheduling/groomers";
import { isStaffUpcomingAppointment } from "@/lib/scheduling/appointment-filters";
import { readSchedulingData } from "@/lib/scheduling/store";
import { GROOMERS } from "@/lib/scheduling/groomers";
import { REBOOK_3W_MS } from "@/lib/notifications/appointment-format";
import type { Appointment } from "@/lib/scheduling/types";
import type { MassSmsEligibleContact } from "./types";
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

export async function listMassSmsEligibleContacts(
  now = new Date()
): Promise<MassSmsEligibleContact[]> {
  const data = await readSchedulingData();
  const campaign = await readMassSmsCampaign();
  const sentThisWeek = phonesSentThisWeek(campaign);
  const sentAtByPhone = new Map(
    campaign.sent.map((r) => [r.phoneKey, r.sentAt] as const)
  );

  const upcomingByPhone = new Set<string>();
  for (const appt of data.appointments) {
    if (appt.status !== "confirmed") continue;
    if (!isStaffUpcomingAppointment(appt, now)) continue;
    upcomingByPhone.add(normalizePhoneKey(appt.phone));
  }

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

  eligible.sort((a, b) => b.daysSinceVisit - a.daysSinceVisit);
  return eligible;
}

export async function getMassSmsStatus(now = new Date()) {
  const eligible = await listMassSmsEligibleContacts(now);
  const campaign = await readMassSmsCampaign();
  const { massRebookSmsPreview } = await import("./message");

  const pending = eligible.filter((c) => !c.sentThisWeek);

  return {
    campaignWeek: currentCampaignWeek(now),
    eligibleCount: eligible.length,
    pendingCount: pending.length,
    sentThisWeekCount: eligible.filter((c) => c.sentThisWeek).length,
    lastBatchAt: campaign.lastBatchAt,
    messagePreview: massRebookSmsPreview(),
  };
}
