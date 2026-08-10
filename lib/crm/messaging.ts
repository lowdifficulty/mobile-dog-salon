import "server-only";
import { sendSms } from "@/lib/notifications/twilio";
import {
  appendInteraction,
  findContactByPhone,
  newContactId,
  newInteractionId,
  upsertContact,
} from "./store";
import { crmPhoneDigits, crmPhoneE164, displayNameFromContact } from "./phone";
import type { CrmContact, CrmInteraction } from "./types";

async function ensureContactForPhone(phone: string): Promise<CrmContact> {
  const existing = await findContactByPhone(phone);
  if (existing) return existing;

  const digits = crmPhoneDigits(phone);
  const now = new Date().toISOString();
  const contact: CrmContact = {
    id: newContactId(),
    phone: digits,
    phoneE164: crmPhoneE164(phone) ?? `+1${digits}`,
    fullName: displayNameFromContact({ phone: digits }),
    pets: [],
    appointmentIds: [],
    status: "lead",
    tags: ["sms-inbound"],
    source: "contact",
    unreadCount: 0,
    botEnabled: true,
    createdAt: now,
    updatedAt: now,
  };
  return upsertContact(contact);
}

export async function sendStaffSms(options: {
  phone: string;
  body: string;
  staffUserId?: string;
  staffName?: string;
  contactId?: string;
}): Promise<{ ok: boolean; interaction?: CrmInteraction; error?: string }> {
  const body = options.body.trim();
  if (!body) return { ok: false, error: "Message body is required" };

  const contact = options.contactId
    ? (await findContactByPhone(options.phone)) || (await ensureContactForPhone(options.phone))
    : await ensureContactForPhone(options.phone);

  const result = await sendSms(contact.phoneE164 || contact.phone, body);
  const now = new Date().toISOString();
  const interaction: CrmInteraction = {
    id: newInteractionId(),
    contactId: contact.id,
    phone: contact.phone,
    channel: "sms",
    direction: "outbound",
    body,
    summary: "Staff SMS",
    messageStatus: result.ok ? "sent" : "failed",
    twilioSid: result.sid,
    actor: "staff",
    staffUserId: options.staffUserId,
    staffName: options.staffName,
    createdAt: now,
    metadata: result.error ? { error: result.error } : undefined,
  };
  await appendInteraction(interaction);
  return { ok: result.ok, interaction, error: result.error };
}

export async function recordInboundSms(options: {
  from: string;
  body: string;
  twilioSid?: string;
}): Promise<{ contact: CrmContact; interaction: CrmInteraction }> {
  const contact = await ensureContactForPhone(options.from);
  const now = new Date().toISOString();
  const interaction: CrmInteraction = {
    id: newInteractionId(),
    contactId: contact.id,
    phone: contact.phone,
    channel: "sms",
    direction: "inbound",
    body: options.body,
    summary: "Inbound SMS",
    messageStatus: "received",
    twilioSid: options.twilioSid,
    actor: "customer",
    createdAt: now,
  };
  await appendInteraction(interaction);
  return { contact, interaction };
}

export async function recordBotSms(options: {
  contact: CrmContact;
  body: string;
  twilioSid?: string;
}): Promise<CrmInteraction> {
  const now = new Date().toISOString();
  const interaction: CrmInteraction = {
    id: newInteractionId(),
    contactId: options.contact.id,
    phone: options.contact.phone,
    channel: "sms",
    direction: "outbound",
    body: options.body,
    summary: "SMS bot reply",
    messageStatus: options.twilioSid ? "sent" : "sent",
    twilioSid: options.twilioSid,
    actor: "bot",
    createdAt: now,
  };
  await appendInteraction(interaction);
  return interaction;
}

export async function recordOutboundCall(options: {
  contact: CrmContact;
  staffUserId?: string;
  staffName?: string;
  twilioSid?: string;
  summary?: string;
}): Promise<CrmInteraction> {
  const now = new Date().toISOString();
  const interaction: CrmInteraction = {
    id: newInteractionId(),
    contactId: options.contact.id,
    phone: options.contact.phone,
    channel: "call",
    direction: "outbound",
    summary: options.summary || "Outbound call",
    callStatus: "queued",
    twilioSid: options.twilioSid,
    actor: "staff",
    staffUserId: options.staffUserId,
    staffName: options.staffName,
    createdAt: now,
  };
  await appendInteraction(interaction);
  return interaction;
}

export async function recordInboundCall(options: {
  from: string;
  twilioSid?: string;
}): Promise<{ contact: CrmContact; interaction: CrmInteraction }> {
  const contact = await ensureContactForPhone(options.from);
  const now = new Date().toISOString();
  const interaction: CrmInteraction = {
    id: newInteractionId(),
    contactId: contact.id,
    phone: contact.phone,
    channel: "call",
    direction: "inbound",
    summary: "Inbound call",
    callStatus: "ringing",
    twilioSid: options.twilioSid,
    actor: "customer",
    createdAt: now,
  };
  await appendInteraction(interaction);
  return { contact, interaction };
}

export async function addCrmNote(options: {
  contactId: string;
  phone: string;
  text: string;
  staffUserId?: string;
  staffName?: string;
}): Promise<CrmInteraction> {
  const now = new Date().toISOString();
  const interaction: CrmInteraction = {
    id: newInteractionId(),
    contactId: options.contactId,
    phone: crmPhoneDigits(options.phone),
    channel: "note",
    direction: "internal",
    body: options.text.trim(),
    summary: "Staff note",
    actor: "staff",
    staffUserId: options.staffUserId,
    staffName: options.staffName,
    createdAt: now,
  };
  await appendInteraction(interaction);
  return interaction;
}
