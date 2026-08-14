import "server-only";

import { listAppointmentsByPhone } from "@/lib/client/appointments";
import type { LickyActionContext } from "@/lib/client/licky-context";
import {
  extractPhoneFromMessage,
  getPendingLickyBooking,
  hasValidContact,
  parseContactMessage,
  saveContactToCtx,
} from "@/lib/client/licky-guest-helpers";
import { displayNameFromContact } from "@/lib/crm/phone";
import { findContactByPhone, upsertContact } from "@/lib/crm/store";
import { phoneLast10 } from "@/lib/leads/normalize";
import { findClientByPhone, updateClient } from "@/lib/payments/store";
import { getServiceLabel } from "@/lib/pricing";
import { groomerClientDisplayName } from "@/lib/scheduling/groomers";
import type { GroomerId } from "@/lib/scheduling/types";

export const LICKY_READY_REPLY = "Great, how can I help you?";

export const LICKY_SKIP_REPLY = "No problem — how can I help you?";

export const LICKY_GATE_RETRY_REPLY =
  "I just need your name and phone number. If you don't have one, just say so and we can keep chatting!";

const MAX_IDENTIFY_ATTEMPTS = 2;

export function isLickyIdentifySkip(message: string): boolean {
  const t = message.trim().toLowerCase();
  return (
    /\b(don'?t|do not)\s+have\s+(an?\s+)?account\b/.test(t) ||
    /\bno account\b/.test(t) ||
    /\bnot a (customer|client|member)\b/.test(t) ||
    /\b(i'?m|i am)\s+(new|just looking|just browsing|just asking)\b/.test(t) ||
    /\b(just looking|just browsing|first time)\b/.test(t) ||
    /\b(skip|rather not|prefer not|no thanks|no thank you)\b/.test(t) ||
    /\b(don'?t|do not)\s+want\s+to\s+(give|share|provide)\b/.test(t) ||
    /\b(i'?d|i would)\s+rather not\b/.test(t) ||
    /\bi don'?t have one\b/.test(t)
  );
}

function isRealGivenName(name: string | undefined): boolean {
  const n = (name ?? "").trim();
  return Boolean(n) && !/^guest$/i.test(n);
}

export function isLickyIdentified(ctx: LickyActionContext): boolean {
  if (ctx.loggedIn || ctx.guest?.skippedIdentify || ctx.guest?.identifyComplete) {
    return true;
  }
  return hasValidContact(ctx) && isRealGivenName(ctx.guest?.firstName);
}

function looksLikeStandaloneName(message: string): boolean {
  const t = message.trim();
  if (!t || t.includes("?") || t.length > 48) return false;
  if (extractPhoneFromMessage(t)) return false;
  const stripped = t.replace(
    /^(hi|hello|hey|yes|ok|okay|sure|my name is|name is|i am|i'm|im|this is)\s+/i,
    ""
  );
  if (/^(what|when|where|how|why|who|can|do|does|is|are|price|book|appointment)\b/i.test(stripped)) {
    return false;
  }
  return /^[a-zA-Z][a-zA-Z'-]+(?:\s+[a-zA-Z][a-zA-Z'-]+){0,3}$/.test(stripped.trim());
}

function parseStandaloneName(message: string): { firstName: string; lastName: string } | null {
  if (!looksLikeStandaloneName(message)) return null;
  const stripped = message
    .trim()
    .replace(/^(hi|hello|hey|yes|ok|okay|sure|my name is|name is|i am|i'm|im|this is)\s+/i, "")
    .trim();
  const parts = stripped.split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

async function buildIdentifyReadyReply(phone: string): Promise<string> {
  const upcoming = (await listAppointmentsByPhone(phone).catch(() => [])).filter(
    (ap) => ap.status === "confirmed" && new Date(ap.startAt).getTime() >= Date.now()
  );
  if (!upcoming.length) return LICKY_READY_REPLY;

  const lines = upcoming.slice(0, 3).map((ap) => {
    const when = new Date(ap.startAt).toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return `• ${when} — ${getServiceLabel(ap.service)} with ${groomerClientDisplayName(ap.groomerId as GroomerId)}`;
  });
  const heading =
    upcoming.length === 1
      ? "I found an upcoming appointment on this number:"
      : "I found upcoming appointments on this number:";
  return `${LICKY_READY_REPLY}\n\n${heading}\n${lines.join("\n")}`;
}

/** Save guest phone, then patch matching client account + CRM contact names. */
export async function applyLickyIdentifiedContact(
  ctx: LickyActionContext,
  contact: { firstName: string; lastName: string; phone: string }
): Promise<void> {
  const phone = phoneLast10(contact.phone);
  if (phone.length < 10) return;

  const firstName = isRealGivenName(contact.firstName)
    ? contact.firstName.trim()
    : "";
  const lastName = contact.lastName.trim();

  await saveContactToCtx(ctx, {
    firstName: firstName || ctx.guest?.firstName || "Guest",
    lastName: lastName || ctx.guest?.lastName || "",
    phone,
  });
  ctx.callerPhone = phone;
  if (firstName) {
    await ctx.saveGuest?.({ identifyComplete: true });
  }

  if (!firstName) return;

  const account = await findClientByPhone(phone).catch(() => null);
  if (account) {
    const patch: { firstName: string; lastName?: string } = { firstName };
    if (lastName) patch.lastName = lastName;
    await updateClient(account.id, patch).catch(() => null);
  }

  const crm = await findContactByPhone(phone).catch(() => null);
  if (crm) {
    const nextFirst = firstName || crm.firstName;
    const nextLast = lastName || crm.lastName;
    await upsertContact({
      ...crm,
      firstName: nextFirst,
      lastName: nextLast,
      fullName: displayNameFromContact({
        firstName: nextFirst,
        lastName: nextLast,
        phone: crm.phone,
      }),
      updatedAt: new Date().toISOString(),
    }).catch(() => null);
  }
}

export type IdentifyGateResult =
  | { kind: "pass" }
  | { kind: "reply"; reply: string };

export async function handleLickyIdentifyGate(
  ctx: LickyActionContext,
  lastUserMessage: string
): Promise<IdentifyGateResult> {
  if (isLickyIdentified(ctx)) {
    return { kind: "pass" };
  }

  if (isLickyIdentifySkip(lastUserMessage)) {
    const phone = extractPhoneFromMessage(lastUserMessage);
    const name = parseStandaloneName(lastUserMessage);
    await ctx.saveGuest?.({
      skippedIdentify: true,
      ...(phone ? { phone } : {}),
      ...(name ? { firstName: name.firstName, lastName: name.lastName } : {}),
    });
    if (phone) ctx.callerPhone = phone;
    return { kind: "reply", reply: LICKY_SKIP_REPLY };
  }

  const contact = parseContactMessage(lastUserMessage);
  const standaloneName = parseStandaloneName(lastUserMessage);
  const storedPhone = ctx.guest?.phone ? phoneLast10(ctx.guest.phone) : "";
  const phoneOnly =
    contact?.phone ||
    extractPhoneFromMessage(lastUserMessage) ||
    (storedPhone.length === 10 ? storedPhone : null);

  if (contact && isRealGivenName(contact.firstName)) {
    await applyLickyIdentifiedContact(ctx, contact);
    if (getPendingLickyBooking(ctx)?.slotKey) return { kind: "pass" };
    return { kind: "reply", reply: await buildIdentifyReadyReply(contact.phone) };
  }

  const mergedName = isRealGivenName(contact?.firstName)
    ? { firstName: contact!.firstName, lastName: contact!.lastName }
    : standaloneName
      ? standaloneName
      : isRealGivenName(ctx.guest?.firstName)
        ? { firstName: ctx.guest!.firstName!, lastName: ctx.guest?.lastName || "" }
        : null;

  if (phoneOnly && mergedName) {
    await applyLickyIdentifiedContact(ctx, {
      firstName: mergedName.firstName,
      lastName: mergedName.lastName,
      phone: phoneOnly,
    });
    if (getPendingLickyBooking(ctx)?.slotKey) return { kind: "pass" };
    return { kind: "reply", reply: await buildIdentifyReadyReply(phoneOnly) };
  }

  const attempts = (ctx.guest?.identifyAttempts ?? 0) + 1;
  await ctx.saveGuest?.({
    identifyAttempts: attempts,
    ...(phoneOnly ? { phone: phoneOnly } : {}),
    ...(mergedName
      ? { firstName: mergedName.firstName, lastName: mergedName.lastName }
      : {}),
  });
  if (phoneOnly) ctx.callerPhone = phoneOnly;

  if (attempts >= MAX_IDENTIFY_ATTEMPTS) {
    await ctx.saveGuest?.({ skippedIdentify: true });
    return { kind: "pass" };
  }

  if (phoneOnly && !mergedName) {
    return {
      kind: "reply",
      reply: "Thanks! And what's your name? (Or say skip if you'd rather not.)",
    };
  }
  if (mergedName && !phoneOnly) {
    return {
      kind: "reply",
      reply: `Thanks, ${mergedName.firstName}! What's the best phone number to look up your account?`,
    };
  }

  return { kind: "reply", reply: LICKY_GATE_RETRY_REPLY };
}
