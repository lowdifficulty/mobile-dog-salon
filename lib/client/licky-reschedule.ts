import "server-only";

import { rescheduleAppointment } from "@/lib/scheduling/appointment-actions";
import {
  getAppointmentByPhone,
  getClientAppointment,
  listAppointmentsByPhone,
  listClientAppointments,
} from "@/lib/client/appointments";
import { getLickyAvailabilitySlots } from "@/lib/client/licky-availability";
import type { LickyActionContext } from "@/lib/client/licky-context";
import type { LickyGuestState } from "@/lib/client/licky-guest-types";
import {
  findSlotByKey,
  formatClockLabel,
  isRescheduleConfirmNo,
  isRescheduleConfirmYes,
  looksLikeRescheduleRequest,
  parseClockMinutes,
  resolveRescheduleTarget,
} from "@/lib/client/licky-reschedule-match";
import {
  formatSlotButtonLabel,
  structuredFromText,
  type LickyButton,
  type LickyStructuredResponse,
} from "@/lib/client/licky-response";
import { findLeadForAppointment } from "@/lib/leads/appointment-lead";
import { addLeadNote, readLeadsData, writeLeadsData } from "@/lib/leads/store";
import { getServiceLabel } from "@/lib/pricing";
import {
  formatSelfBookingSlotDisplay,
  groomerClientDisplayName,
} from "@/lib/scheduling/groomers";
import { consumeSlotHold, createSlotHold } from "@/lib/scheduling/slot-holds";
import { parseSlotFromIso, parseSlotKey, slotToISO } from "@/lib/scheduling/slots";
import type { Appointment, AvailableSlot, GroomerId } from "@/lib/scheduling/types";

export type PendingLickyReschedule = NonNullable<
  LickyGuestState["pendingLickyReschedule"]
>;

export type LickyRescheduleParams = {
  appointment_id?: string;
  slot_key?: string;
  preference?: string;
  requested_time?: string;
  date?: string;
  confirmed?: boolean;
};

function ctxPhone(ctx: LickyActionContext): string {
  return (ctx.callerPhone || ctx.guest?.phone || ctx.account?.phone || "").trim();
}

function lickyActor(ctx: LickyActionContext): string {
  if (ctx.account?.email) return `licky:client:${ctx.account.email}`;
  const phone = ctxPhone(ctx).replace(/\D/g, "");
  return phone ? `licky:phone:${phone}` : "licky:guest";
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatApptLine(ap: Appointment): string {
  return `id=${ap.id} | ${formatWhen(ap.startAt)} | ${getServiceLabel(ap.service)} | pet: ${ap.petName || "—"} | groomer: ${groomerClientDisplayName(ap.groomerId)} (${ap.groomerId}) | status: ${ap.status}`;
}

async function confirmedAppointmentsForCtx(ctx: LickyActionContext) {
  const byId = new Map<string, Appointment>();
  if (ctx.loggedIn && ctx.account) {
    for (const ap of await listClientAppointments(ctx.account)) {
      if (ap.status === "confirmed") byId.set(ap.id, ap);
    }
  }
  const phone = ctxPhone(ctx);
  if (phone) {
    for (const ap of await listAppointmentsByPhone(phone)) {
      if (ap.status === "confirmed") byId.set(ap.id, ap);
    }
  }
  return [...byId.values()].sort((a, b) => a.startAt.localeCompare(b.startAt));
}

async function upcomingAppointmentsForCtx(ctx: LickyActionContext) {
  const now = Date.now();
  return (await confirmedAppointmentsForCtx(ctx)).filter(
    (ap) => new Date(ap.startAt).getTime() >= now
  );
}

async function appointmentForCtx(ctx: LickyActionContext, appointmentId: string) {
  if (ctx.loggedIn && ctx.account) {
    const owned = await getClientAppointment(ctx.account, appointmentId);
    if (owned) return owned;
  }
  const phone = ctxPhone(ctx);
  if (!phone) return null;
  return getAppointmentByPhone(phone, appointmentId);
}

export function getPendingLickyReschedule(
  ctx: LickyActionContext
): PendingLickyReschedule | null {
  return ctx.guest?.pendingLickyReschedule ?? null;
}

export async function savePendingReschedule(
  ctx: LickyActionContext,
  pending: PendingLickyReschedule
): Promise<void> {
  await ctx.saveGuest?.({ pendingLickyReschedule: pending });
}

export async function clearPendingReschedule(
  ctx: LickyActionContext
): Promise<void> {
  await ctx.saveGuest?.({ pendingLickyReschedule: null });
}

export function buildLickyRescheduleNote(
  fromIso: string,
  toIso: string,
  requestedClock: string | undefined,
  via: "chat" | "sms"
): string {
  const from = formatTimeOnly(fromIso);
  const to = formatTimeOnly(toIso);
  const channel = via === "sms" ? "Licky SMS" : "Licky chat";
  const base = `Rescheduled via ${channel} from ${from} to ${to}`;
  if (requestedClock && requestedClock !== to) {
    return `${base} (requested ${requestedClock})`;
  }
  return base;
}

export async function recordLickyRescheduleFollowUp(
  appointment: Appointment,
  note: string
): Promise<void> {
  try {
    const lead = await findLeadForAppointment(appointment);
    if (!lead) return;
    await addLeadNote(lead.id, note);
    const data = await readLeadsData();
    const idx = data.leads.findIndex((l) => l.id === lead.id);
    if (idx < 0) return;
    data.leads[idx] = {
      ...data.leads[idx],
      appointmentStartAt: appointment.startAt,
      updatedAt: new Date().toISOString(),
    };
    await writeLeadsData(data);
  } catch (err) {
    console.error("Licky reschedule CRM note failed:", err);
  }
}

function alternativeButtons(
  appointmentId: string,
  slots: AvailableSlot[]
): LickyButton[] {
  return slots.slice(0, 3).map((s) => ({
    label: formatSlotButtonLabel(s),
    action: "reschedule_slot" as const,
    payload: { appointmentId, slotKey: s.slotKey },
  }));
}

function previewButtons(appointmentId: string, slot: AvailableSlot): LickyButton[] {
  return [
    {
      label: "YES, move it",
      action: "send_message",
      payload: { message: "YES" },
    },
    {
      label: "Keep current time",
      action: "send_message",
      payload: { message: "NO" },
    },
    ...alternativeButtons(appointmentId, [slot]).slice(0, 0),
  ];
}

function preferenceFromParams(params: LickyRescheduleParams): string {
  return [params.preference, params.requested_time, params.date, params.slot_key]
    .filter((v) => typeof v === "string" && v.trim())
    .join(" ")
    .trim();
}

function pickUpcoming(
  upcoming: Appointment[],
  appointmentId: string | undefined,
  preference: string
): Appointment | { error: string } {
  if (appointmentId) {
    const found = upcoming.find((ap) => ap.id === appointmentId);
    if (!found) return { error: "I couldn't find that upcoming appointment on this number." };
    return found;
  }
  if (upcoming.length === 1) return upcoming[0];
  const pet = preference.match(/\bfor\s+([A-Za-z][A-Za-z'-]{1,20})\b/);
  if (pet?.[1]) {
    const name = pet[1].toLowerCase();
    const match = upcoming.filter((ap) => ap.petName.toLowerCase() === name);
    if (match.length === 1) return match[0];
  }
  const lines = upcoming.map((ap) => `• ${formatApptLine(ap)}`).join("\n");
  return {
    error: `You have more than one upcoming visit. Tell me which one to move:\n${lines}`,
  };
}

async function loadOpenSlots(
  appointment: Appointment,
  holdOwnerId: string
): Promise<AvailableSlot[]> {
  const data = await getLickyAvailabilitySlots({
    service: appointment.service || "full-groom",
    days: 14,
    groomerId: appointment.groomerId,
    holdOwnerId,
  });
  let slots = data.slots;
  if (!slots.length) {
    const anyGroomer = await getLickyAvailabilitySlots({
      service: appointment.service || "full-groom",
      days: 14,
      holdOwnerId,
    });
    slots = anyGroomer.slots;
  }
  return slots;
}

function slotFromKey(slotKey: string, openSlots: AvailableSlot[]): AvailableSlot | null {
  const known = findSlotByKey(openSlots, slotKey);
  if (known) return known;
  try {
    const parsed = parseSlotKey(slotKey);
    return {
      groomerId: parsed.groomerId,
      groomerName: groomerClientDisplayName(parsed.groomerId),
      date: parsed.date,
      time: parsed.time,
      displayTime: formatSelfBookingSlotDisplay(parsed.time, parsed.groomerId),
      slotKey,
    };
  } catch {
    return null;
  }
}

async function persistReschedule(
  ctx: LickyActionContext,
  appointment: Appointment,
  slotKey: string,
  requestedClock: string | undefined,
  via: "chat" | "sms" = "chat"
): Promise<LickyStructuredResponse> {
  const oldStart = appointment.startAt;
  let newIso = oldStart;
  try {
    const parsed = parseSlotKey(slotKey);
    newIso = slotToISO(parsed.date, parsed.time);
  } catch {
    /* rescheduleAppointment will reject an invalid key */
  }
  const note = buildLickyRescheduleNote(oldStart, newIso, requestedClock, via);
  const result = await rescheduleAppointment(appointment.id, slotKey, lickyActor(ctx), {
    holdOwnerId: ctx.holdOwnerId,
    notesAppend: note,
  });

  if (!result.ok) {
    await clearPendingReschedule(ctx);
    const open = await loadOpenSlots(appointment, ctx.holdOwnerId);
    const alts = open
      .filter((s) => s.slotKey !== slotKey)
      .slice(0, 5);
    const altText = alts.length
      ? ` Open times: ${alts.map((s) => `${s.date} ${s.displayTime}`).join("; ")}.`
      : " Try /book or call (949) 755-8994.";
    return {
      reply: `I couldn't move that visit — ${result.error} Your appointment is still ${formatWhen(oldStart)}.${altText}`,
      buttons: alternativeButtons(appointment.id, alts),
    };
  }

  if (result.appointment.startAt === oldStart) {
    await clearPendingReschedule(ctx);
    return structuredFromText(
      `You're already booked for ${formatWhen(oldStart)}. I did not change it.`
    );
  }

  const writtenNote = buildLickyRescheduleNote(
    oldStart,
    result.appointment.startAt,
    requestedClock,
    via
  );
  await recordLickyRescheduleFollowUp(result.appointment, writtenNote);
  try {
    await consumeSlotHold(ctx.holdOwnerId, slotKey);
  } catch (err) {
    console.error("Licky reschedule hold release failed:", err);
  }
  await clearPendingReschedule(ctx);

  return structuredFromText(
    `Moved! ${result.appointment.petName || "Your pup"} is now ${formatWhen(result.appointment.startAt)} with ${groomerClientDisplayName(result.appointment.groomerId)}.`
  );
}

export async function lickyRescheduleAppointment(
  ctx: LickyActionContext,
  params: LickyRescheduleParams
): Promise<LickyStructuredResponse> {
  if (!ctx.loggedIn && !ctxPhone(ctx)) {
    return structuredFromText(
      "I need your mobile number to find the appointment, or log in at /client/login."
    );
  }

  const upcoming = await upcomingAppointmentsForCtx(ctx);
  if (!upcoming.length) {
    return structuredFromText(
      "I don't see an upcoming confirmed visit on this number. Book at /book or call (949) 755-8994."
    );
  }

  const preference = preferenceFromParams(params);
  const pending = getPendingLickyReschedule(ctx);

  if (params.confirmed && pending && !params.slot_key && !params.appointment_id) {
    const ap = await appointmentForCtx(ctx, pending.appointmentId);
    if (!ap) {
      await clearPendingReschedule(ctx);
      return structuredFromText("I couldn't find that appointment anymore. Nothing was changed.");
    }
    return persistReschedule(ctx, ap, pending.slotKey, pending.requestedClock);
  }

  const picked = pickUpcoming(
    upcoming,
    params.appointment_id?.trim() || pending?.appointmentId,
    preference
  );
  if ("error" in picked) {
    return structuredFromText(picked.error);
  }

  const current = parseSlotFromIso(picked.startAt);
  const openSlots = await loadOpenSlots(picked, ctx.holdOwnerId);

  let target: AvailableSlot | null = null;
  let requestedClock: string | undefined;
  let mappedFromSameWindow = false;
  let alternatives: AvailableSlot[] = [];

  if (params.slot_key?.trim()) {
    target = slotFromKey(params.slot_key.trim(), openSlots);
    if (!target) {
      return structuredFromText(
        "That slot_key isn't valid. Use find_slot or check_availability, then reschedule with a real slot_key. I did not change the appointment."
      );
    }
    if (
      target.groomerId === picked.groomerId &&
      target.date === current.date &&
      target.time === current.time
    ) {
      return structuredFromText(
        `You're already booked for ${formatWhen(picked.startAt)} (${target.displayTime}). I did not change it.`
      );
    }
    requestedClock =
      pending?.requestedClock ||
      (parseClockMinutes(preference) != null
        ? formatClockLabel(parseClockMinutes(preference)!)
        : undefined);
  } else {
    const match = resolveRescheduleTarget({
      currentDate: current.date,
      currentTime: current.time,
      currentGroomerId: picked.groomerId,
      preference,
      openSlots,
    });
    requestedClock = match.requestedClock;
    if (match.status === "target") {
      target = match.slot;
      mappedFromSameWindow = match.mappedFromSameWindow;
    } else {
      alternatives = match.alternatives;
    }
  }

  if (!target) {
    const asked = requestedClock ? ` for ${requestedClock}` : "";
    const altText = alternatives.length
      ? ` Here are open times: ${alternatives.map((s) => `${s.date} ${s.displayTime} (${s.groomerName})`).join("; ")}.`
      : " No open times in the next 2 weeks for that groomer.";
    return {
      reply: `I can't move you${asked} — that time isn't an open booking slot. Your visit is still ${formatWhen(picked.startAt)}.${altText} I did not change the appointment.`,
      buttons: alternativeButtons(picked.id, alternatives),
    };
  }

  if (!params.confirmed) {
    const hold = await createSlotHold(ctx.holdOwnerId, target.slotKey);
    if (!hold.ok) {
      const open = await loadOpenSlots(picked, ctx.holdOwnerId);
      return {
        reply: `${hold.error} Your visit is still ${formatWhen(picked.startAt)}. I did not change it.`,
        buttons: alternativeButtons(picked.id, open.slice(0, 3)),
      };
    }

    await savePendingReschedule(ctx, {
      appointmentId: picked.id,
      slotKey: target.slotKey,
      fromLabel: formatWhen(picked.startAt),
      toLabel: `${target.date} ${target.displayTime}`,
      requestedClock,
      requestedPreference: preference || undefined,
    });

    const windowNote = mappedFromSameWindow
      ? ` ${requestedClock || "That time"} is still in your current ${formatSelfBookingSlotDisplay(current.time, picked.groomerId)} window, so the next bookable start is ${target.displayTime}.`
      : requestedClock && requestedClock !== formatClockLabel(target.time)
        ? ` We book arrival windows — ${requestedClock} maps to ${target.displayTime}.`
        : "";

    return {
      reply: `I can move ${picked.petName || "your"} ${formatWhen(picked.startAt)} visit to ${target.date} ${target.displayTime} with ${target.groomerName}.${windowNote} Reply YES to confirm — I will not change it until you do.`,
      buttons: previewButtons(picked.id, target),
    };
  }

  return persistReschedule(ctx, picked, target.slotKey, requestedClock);
}

export async function lickyHandleRescheduleTurn(
  ctx: LickyActionContext,
  message: string
): Promise<LickyStructuredResponse | null> {
  const pending = getPendingLickyReschedule(ctx);

  if (pending) {
    if (isRescheduleConfirmNo(message)) {
      await clearPendingReschedule(ctx);
      return structuredFromText(
        `No problem — your appointment is still ${pending.fromLabel}. Nothing was changed.`
      );
    }
    if (isRescheduleConfirmYes(message)) {
      return lickyRescheduleAppointment(ctx, {
        appointment_id: pending.appointmentId,
        slot_key: pending.slotKey,
        confirmed: true,
        requested_time: pending.requestedClock,
      });
    }
    if (
      looksLikeRescheduleRequest(message) ||
      parseClockMinutes(message) != null
    ) {
      return lickyRescheduleAppointment(ctx, {
        appointment_id: pending.appointmentId,
        preference: message,
        confirmed: false,
      });
    }
    return null;
  }

  if (!looksLikeRescheduleRequest(message)) return null;

  return lickyRescheduleAppointment(ctx, {
    preference: message,
    confirmed: false,
  });
}

export { formatApptLine };
