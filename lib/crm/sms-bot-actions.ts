import "server-only";

import {
  cancelAppointment,
  createAppointment,
  rescheduleAppointment,
  type CreateAppointmentInput,
} from "@/lib/scheduling/appointment-actions";
import { getLickyAvailabilitySlots } from "@/lib/client/licky-availability";
import {
  buildLickyRescheduleNote,
  recordLickyRescheduleFollowUp,
} from "@/lib/client/licky-reschedule";
import { resolveRescheduleTarget } from "@/lib/client/licky-reschedule-match";
import { rankSlotsForPreference } from "@/lib/client/licky-slot-match";
import { groomerName } from "@/lib/scheduling/groomers";
import { parseSlotFromIso, parseSlotKey, slotToISO } from "@/lib/scheduling/slots";
import { readSchedulingData } from "@/lib/scheduling/store";
import type { Appointment, GroomerId } from "@/lib/scheduling/types";
import { companyLegal } from "@/lib/company-legal";
import type { CrmContact } from "./types";
import { upsertContact } from "./store";
import {
  formatSmsSlotLabel,
  slotsToSessionOptions,
} from "./sms-bot-session";

const SMS_BOT_ACTOR_PREFIX = "sms-bot";

export function smsBotActor(contact: CrmContact): string {
  return `${SMS_BOT_ACTOR_PREFIX}:${contact.phone}`;
}

export function formatAppointmentWhen(startAt: string): string {
  return new Date(startAt).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function listContactAppointments(contact: CrmContact): Promise<{
  upcoming: Appointment[];
  past: Appointment[];
}> {
  const { appointments } = await readSchedulingData();
  const now = Date.now();
  const mine = appointments.filter(
    (a) =>
      a.phone.replace(/\D/g, "").endsWith(contact.phone) ||
      contact.appointmentIds.includes(a.id)
  );

  const upcoming = mine
    .filter((a) => a.status === "confirmed" && new Date(a.startAt).getTime() >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

  const past = mine
    .filter((a) => new Date(a.startAt).getTime() < now)
    .sort((a, b) => b.startAt.localeCompare(a.startAt));

  return { upcoming, past };
}

export async function getPrimaryUpcomingAppointment(
  contact: CrmContact
): Promise<Appointment | null> {
  const { upcoming } = await listContactAppointments(contact);
  return upcoming[0] ?? null;
}

function parseGroomerHint(text: string): GroomerId | undefined {
  const t = text.toLowerCase();
  if (/\bmelanie\b/.test(t)) return "melanie";
  if (/\bdiamond\b|\bsarah\b/.test(t)) return "diamond";
  if (/\bjessica\b|\bchris\b/.test(t)) return "jessica";
  return undefined;
}

export async function smsListBookableSlots(
  contact: CrmContact,
  options: { preference?: string; groomerId?: GroomerId; service?: string } = {}
): Promise<{ slots: ReturnType<typeof slotsToSessionOptions>; service: string }> {
  const service = options.service?.trim() || contact.service?.trim() || "full-groom";
  const groomerId =
    options.groomerId ||
    (contact.groomerId as GroomerId | undefined) ||
    parseGroomerHint(options.preference ?? "");

  const data = await getLickyAvailabilitySlots({
    service,
    days: 14,
    groomerId,
    holdOwnerId: `sms:${contact.id}`,
  });

  const ranked = rankSlotsForPreference(data.slots, {
    preference: options.preference ?? "",
    groomerId,
    limit: 5,
  });

  const picks = ranked.length ? ranked : data.slots.slice(0, 5);
  return {
    slots: slotsToSessionOptions(picks),
    service,
  };
}

export type SmsBookingReadiness = {
  ok: boolean;
  missing: string[];
};

export function smsBookingReadiness(contact: CrmContact): SmsBookingReadiness {
  const missing: string[] = [];
  if (!contact.firstName?.trim()) missing.push("first name");
  if (!contact.lastName?.trim()) missing.push("last name");
  if (!contact.address?.trim()) missing.push("street address");
  if (!contact.zipCode?.trim()) missing.push("ZIP code");
  const pet = contact.pets.find((p) => p.petName?.trim());
  if (!pet?.petSize?.trim() && !contact.pets.some((p) => p.petSize?.trim())) {
    missing.push("pet size (small/medium/large)");
  }
  return { ok: missing.length === 0, missing };
}

function buildCreateInput(
  contact: CrmContact,
  slotKey: string,
  service: string
): CreateAppointmentInput | { error: string } {
  const readiness = smsBookingReadiness(contact);
  if (!readiness.ok) {
    return {
      error: `I still need your ${readiness.missing.join(", ")}. Finish at ${companyLegal.siteUrl}/book or text us those details.`,
    };
  }

  const pet = contact.pets.find((p) => p.petName?.trim()) ?? contact.pets[0];
  const petSize = pet?.petSize?.trim() || "medium";

  return {
    slotKey,
    service,
    petName: pet?.petName?.trim() || "Dog",
    petBreed: pet?.petBreed,
    petSize,
    firstName: contact.firstName!.trim(),
    lastName: contact.lastName!.trim(),
    email: contact.email,
    phone: contact.phone,
    smsOptIn: contact.smsOptIn !== false,
    address: contact.address!.trim(),
    city: contact.city?.trim(),
    zipCode: contact.zipCode!.trim(),
    notes: "Booked via Licky SMS.",
  };
}

export async function linkAppointmentToContact(
  contact: CrmContact,
  appointmentId: string
): Promise<CrmContact> {
  const ids = contact.appointmentIds.includes(appointmentId)
    ? contact.appointmentIds
    : [...contact.appointmentIds, appointmentId];
  return upsertContact({
    ...contact,
    appointmentIds: ids,
    status: contact.status === "lead" ? "customer" : contact.status,
    updatedAt: new Date().toISOString(),
  });
}

export async function smsCancelUpcoming(
  contact: CrmContact,
  appointmentId: string
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const { upcoming } = await listContactAppointments(contact);
  const appt = upcoming.find((a) => a.id === appointmentId);
  if (!appt) {
    return { ok: false, error: "I couldn't find that upcoming appointment on your number." };
  }

  const result = await cancelAppointment(appointmentId, smsBotActor(contact), {
    cancelledVia: "sms_bot",
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    message: `Cancelled ${appt.petName || "your pup"}'s visit on ${formatAppointmentWhen(appt.startAt)}. Reply BOOK anytime to schedule again.`,
  };
}

export async function resolveSmsReschedulePreference(
  contact: CrmContact,
  appt: Appointment,
  preference: string
): Promise<{
  kind: "confirm" | "pick";
  slot?: { slotKey: string; label: string };
  slots: ReturnType<typeof slotsToSessionOptions>;
  preview: string;
}> {
  const { slots: listed } = await smsListBookableSlots(contact, {
    preference,
    groomerId: appt.groomerId,
    service: appt.service,
  });

  const data = await getLickyAvailabilitySlots({
    service: appt.service || "full-groom",
    days: 14,
    groomerId: appt.groomerId,
    holdOwnerId: `sms:${contact.id}`,
  });
  const current = parseSlotFromIso(appt.startAt);
  const match = resolveRescheduleTarget({
    currentDate: current.date,
    currentTime: current.time,
    currentGroomerId: appt.groomerId,
    preference,
    openSlots: data.slots,
  });

  if (match.status === "target") {
    const label = `${match.slot.date} ${match.slot.displayTime} ${match.slot.groomerName}`;
    const windowNote = match.mappedFromSameWindow
      ? ` ${match.requestedClock || "That time"} is still in your current window, so the next bookable start is ${match.slot.displayTime}.`
      : match.requestedClock
        ? ` We book arrival windows — ${match.requestedClock} maps to ${match.slot.displayTime}.`
        : "";
    return {
      kind: "confirm",
      slot: { slotKey: match.slot.slotKey, label },
      slots: listed,
      preview: `I can move ${describeUpcoming(appt)} to ${label}.${windowNote}`,
    };
  }

  const fallback = listed.length
    ? listed
    : slotsToSessionOptions(match.alternatives);
  const asked = match.requestedClock ? ` ${match.requestedClock}` : "";
  return {
    kind: "pick",
    slots: fallback,
    preview: asked
      ? `${asked.trim()} isn't an open start time. Your visit is still ${describeUpcoming(appt)}. Pick a new time:`
      : `Move ${describeUpcoming(appt)}. Pick a new time:`,
  };
}

export async function smsRescheduleUpcoming(
  contact: CrmContact,
  appointmentId: string,
  slotKey: string
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const { upcoming } = await listContactAppointments(contact);
  const appt = upcoming.find((a) => a.id === appointmentId);
  if (!appt) {
    return { ok: false, error: "I couldn't find that upcoming appointment on your number." };
  }

  const oldStart = appt.startAt;
  let newIso = oldStart;
  try {
    const parsed = parseSlotKey(slotKey);
    newIso = slotToISO(parsed.date, parsed.time);
  } catch {
    /* rescheduleAppointment rejects invalid keys */
  }
  const note = buildLickyRescheduleNote(oldStart, newIso, undefined, "sms");

  const result = await rescheduleAppointment(appointmentId, slotKey, smsBotActor(contact), {
    groomerId: appt.groomerId,
    notesAppend: note,
  });
  if (!result.ok) {
    return {
      ok: false,
      error: `${result.error} Your visit is still ${formatAppointmentWhen(oldStart)}. I did not change it.`,
    };
  }

  await recordLickyRescheduleFollowUp(result.appointment, note);

  return {
    ok: true,
    message: `Updated! ${result.appointment.petName || "Your pup"} is now booked for ${formatAppointmentWhen(result.appointment.startAt)} with ${groomerName(result.appointment.groomerId)}.`,
  };
}

export async function smsBookSlot(
  contact: CrmContact,
  slotKey: string,
  service: string
): Promise<{ ok: true; message: string; appointmentId: string } | { ok: false; error: string }> {
  const input = buildCreateInput(contact, slotKey, service);
  if ("error" in input) {
    return { ok: false, error: input.error };
  }

  const result = await createAppointment(input, smsBotActor(contact), {
    holdOwnerId: `sms:${contact.id}`,
    skipHold: true,
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  await linkAppointmentToContact(contact, result.appointment.id);

  try {
    const { runBookingFollowUp } = await import("@/lib/scheduling/booking-follow-up");
    await runBookingFollowUp(result.appointment, "booking");
  } catch (err) {
    console.error("SMS bot booking follow-up failed:", err);
  }

  return {
    ok: true,
    appointmentId: result.appointment.id,
    message: `You're booked! ${result.appointment.petName || "Your pup"} — ${formatAppointmentWhen(result.appointment.startAt)} with ${groomerName(result.appointment.groomerId)}.`,
  };
}

export function describeUpcoming(appt: Appointment): string {
  return `${appt.petName || "Your pup"} on ${formatAppointmentWhen(appt.startAt)} with ${groomerName(appt.groomerId)}`;
}

export { formatSmsSlotLabel };
