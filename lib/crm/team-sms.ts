import "server-only";
import { companyLegal } from "@/lib/company-legal";
import { sendSms } from "@/lib/notifications/twilio";
import { phonesMatch } from "@/lib/leads/normalize";
import {
  appendInteraction,
  findContactById,
  newInteractionId,
  upsertContact,
} from "./store";
import { crmPhoneDigits, crmPhoneE164, displayNameFromContact } from "./phone";
import type { CrmContact, CrmInteraction } from "./types";
import { TEAM_SMS_CONTACT_ID, TEAM_SMS_ROSTER } from "./team-sms-constants";

export type TeamSmsParticipant = {
  id: string;
  name: string;
  /** 10-digit US phone. */
  phone: string;
  role?: "owner" | "groomer" | "staff" | "custom";
};

/** Default internal team recipients (Mary = business line sender, not listed here). */
export const DEFAULT_TEAM_SMS_PARTICIPANTS: TeamSmsParticipant[] = [
  {
    id: "melanie",
    name: "Melanie",
    phone: TEAM_SMS_ROSTER.melanie,
    role: "groomer",
  },
  {
    id: "jessica",
    name: "Jessica",
    phone: TEAM_SMS_ROSTER.jessica,
    role: "groomer",
  },
  {
    id: "chris",
    name: "Chris",
    phone: TEAM_SMS_ROSTER.chris,
    role: "groomer",
  },
  {
    id: "matthew",
    name: "Matthew",
    phone: TEAM_SMS_ROSTER.matthew,
    role: "owner",
  },
];

function participantByPhone(
  phone: string,
  extras: TeamSmsParticipant[] = []
): TeamSmsParticipant | null {
  const digits = crmPhoneDigits(phone);
  const all = [...DEFAULT_TEAM_SMS_PARTICIPANTS, ...extras];
  return all.find((p) => phonesMatch(p.phone, digits)) ?? null;
}

export function isTeamSmsContact(contact: Pick<CrmContact, "id" | "tags">): boolean {
  return contact.id === TEAM_SMS_CONTACT_ID || contact.tags.includes("team-sms");
}

export function listTeamParticipants(contact?: CrmContact | null): TeamSmsParticipant[] {
  const customPhones = contact?.teamParticipantPhones ?? [];
  const custom: TeamSmsParticipant[] = customPhones.map((phone, i) => {
    const digits = crmPhoneDigits(phone);
    const known = participantByPhone(digits);
    if (known) return known;
    return {
      id: `custom-${digits}`,
      name: displayNameFromContact({ phone: digits }),
      phone: digits,
      role: "custom" as const,
    };
  });

  const seen = new Set<string>();
  const merged: TeamSmsParticipant[] = [];
  for (const p of [...DEFAULT_TEAM_SMS_PARTICIPANTS, ...custom]) {
    const digits = crmPhoneDigits(p.phone);
    if (digits.length < 10 || seen.has(digits)) continue;
    seen.add(digits);
    merged.push({ ...p, phone: digits });
  }
  return merged;
}

export function isTeamParticipantPhone(phone: string, contact?: CrmContact | null): boolean {
  const digits = crmPhoneDigits(phone);
  if (digits.length < 10) return false;
  return listTeamParticipants(contact).some((p) => phonesMatch(p.phone, digits));
}

export function resolveTeamParticipantName(
  phone: string,
  contact?: CrmContact | null
): string {
  return participantByPhone(phone, listTeamParticipants(contact))?.name ?? formatPhoneLabel(phone);
}

function formatPhoneLabel(phone: string): string {
  const digits = crmPhoneDigits(phone);
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits || phone;
}

export async function ensureTeamSmsContact(): Promise<CrmContact> {
  const existing = await findContactById(TEAM_SMS_CONTACT_ID);
  if (existing) return existing;

  const businessDigits = crmPhoneDigits(companyLegal.businessPhone);
  const now = new Date().toISOString();
  const contact: CrmContact = {
    id: TEAM_SMS_CONTACT_ID,
    phone: businessDigits,
    phoneE164: companyLegal.businessPhone,
    fullName: "Team SMS",
    pets: [],
    appointmentIds: [],
    status: "inactive",
    tags: ["team-sms"],
    source: "import",
    unreadCount: 0,
    botEnabled: false,
    teamParticipantPhones: [],
    createdAt: now,
    updatedAt: now,
  };
  return upsertContact(contact);
}

export async function addTeamParticipantPhone(
  phone: string,
  name?: string
): Promise<{ ok: boolean; contact?: CrmContact; error?: string }> {
  const digits = crmPhoneDigits(phone);
  if (digits.length < 10) {
    return { ok: false, error: "Enter a valid 10-digit phone number" };
  }

  const contact = await ensureTeamSmsContact();
  if (isTeamParticipantPhone(digits, contact)) {
    return { ok: true, contact };
  }

  const extras = [...(contact.teamParticipantPhones ?? []), digits];
  const updated: CrmContact = {
    ...contact,
    teamParticipantPhones: extras,
    updatedAt: new Date().toISOString(),
    ...(name?.trim() ? { fullName: contact.fullName } : {}),
  };
  const saved = await upsertContact(updated);
  return { ok: true, contact: saved };
}

function normalizeRecipientPhones(
  recipients: string[] | undefined,
  contact: CrmContact
): string[] {
  const pool = listTeamParticipants(contact);
  if (!recipients?.length) {
    return pool.map((p) => p.phone);
  }
  const allowed = new Set(pool.map((p) => crmPhoneDigits(p.phone)));
  const picked: string[] = [];
  for (const raw of recipients) {
    const digits = crmPhoneDigits(raw);
    if (digits.length >= 10 && allowed.has(digits)) {
      picked.push(digits);
    }
  }
  return [...new Set(picked)];
}

/** Fan-out SMS from Mary's business line to each selected team recipient. */
export async function sendTeamSms(options: {
  body: string;
  recipientPhones?: string[];
  staffUserId?: string;
  staffName?: string;
}): Promise<{
  ok: boolean;
  interaction?: CrmInteraction;
  error?: string;
  sentCount?: number;
}> {
  const body = options.body.trim();
  if (!body) return { ok: false, error: "Message body is required" };

  const contact = await ensureTeamSmsContact();
  const targets = normalizeRecipientPhones(options.recipientPhones, contact);
  if (targets.length === 0) {
    return { ok: false, error: "Select at least one team recipient" };
  }

  const now = new Date().toISOString();
  const delivery: { phone: string; name: string; ok: boolean; sid?: string; error?: string }[] =
    [];

  for (const phone of targets) {
    const e164 = crmPhoneE164(phone) ?? `+1${phone}`;
    const result = await sendSms(e164, body, { skipOptOutCheck: true });
    delivery.push({
      phone,
      name: resolveTeamParticipantName(phone, contact),
      ok: result.ok,
      sid: result.sid,
      error: result.error,
    });
  }

  const sentCount = delivery.filter((d) => d.ok).length;
  const names = delivery.map((d) => d.name).join(", ");
  const sids = delivery.filter((d) => d.sid).map((d) => d.sid!).join(",");

  const interaction: CrmInteraction = {
    id: newInteractionId(),
    contactId: contact.id,
    phone: contact.phone,
    channel: "sms",
    direction: "outbound",
    body,
    summary: sentCount > 0 ? `Team SMS → ${names}` : "Team SMS failed",
    messageStatus: sentCount > 0 ? "sent" : "failed",
    twilioSid: sids || undefined,
    actor: "staff",
    staffUserId: options.staffUserId,
    staffName: options.staffName ?? "Mary",
    createdAt: now,
    metadata: {
      teamSms: true,
      recipientPhones: targets.join(","),
      recipientNames: names,
      sentCount,
      failedCount: delivery.length - sentCount,
      ...(delivery.some((d) => !d.ok)
        ? { errors: delivery.filter((d) => !d.ok).map((d) => `${d.name}: ${d.error}`).join("; ") }
        : {}),
    },
  };

  await appendInteraction(interaction);

  if (sentCount === 0) {
    return {
      ok: false,
      interaction,
      error: delivery.find((d) => d.error)?.error ?? "Failed to send team SMS",
      sentCount: 0,
    };
  }

  return {
    ok: true,
    interaction,
    sentCount,
    error:
      sentCount < delivery.length
        ? `Sent to ${sentCount} of ${delivery.length} recipients`
        : undefined,
  };
}

export async function recordTeamInboundSms(options: {
  from: string;
  body: string;
  twilioSid?: string;
}): Promise<{ contact: CrmContact; interaction: CrmInteraction }> {
  const contact = await ensureTeamSmsContact();
  const senderPhone = crmPhoneDigits(options.from);
  const senderName = resolveTeamParticipantName(senderPhone, contact);
  const now = new Date().toISOString();

  const interaction: CrmInteraction = {
    id: newInteractionId(),
    contactId: contact.id,
    phone: senderPhone,
    channel: "sms",
    direction: "inbound",
    body: options.body,
    summary: `Team SMS from ${senderName}`,
    messageStatus: "received",
    twilioSid: options.twilioSid,
    actor: "customer",
    createdAt: now,
    metadata: {
      teamSms: true,
      senderPhone,
      senderName,
    },
  };

  await appendInteraction(interaction);
  return { contact, interaction };
}
