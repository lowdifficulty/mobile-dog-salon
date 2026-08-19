import "server-only";
import OpenAI from "openai";
import { companyLegal } from "@/lib/company-legal";
import { formatPrice, buildPublishedPricingFacts } from "@/lib/pricing";
import { getAppointmentBookedPrice } from "@/lib/booking/appointment-title";
import { groomerName } from "@/lib/scheduling/groomers";
import { readSchedulingData } from "@/lib/scheduling/store";
import type { GroomerId } from "@/lib/scheduling/types";
import type { CrmContact } from "@/lib/crm/types";
import { listInteractionsForContact } from "@/lib/crm/store";
import {
  psidAllowedForMetaBot,
  readMetaBotConfig,
  type MetaBotConfig,
} from "./meta-bot-config";
import { sendMetaTextMessage } from "./client";
import { recordBotMetaDm } from "./messaging";

const BOOK_URL = `${companyLegal.siteUrl}/book`;
const MY_APPT_URL = `${companyLegal.siteUrl}/my-appointment`;

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export async function isMetaBotEnabled(): Promise<boolean> {
  if (process.env.META_BOT_ENABLED === "0" || process.env.META_BOT_ENABLED === "false") {
    return false;
  }
  const config = await readMetaBotConfig();
  return config.enabled;
}

async function contactAppointmentContext(contact: CrmContact) {
  const { appointments } = await readSchedulingData();
  const mine = appointments.filter(
    (a) =>
      a.phone.replace(/\D/g, "").endsWith(contact.phone) ||
      contact.appointmentIds.includes(a.id)
  );
  const now = Date.now();
  const upcoming = mine
    .filter((a) => a.status === "confirmed" && new Date(a.startAt).getTime() >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
  return upcoming
    ? {
        startAt: upcoming.startAt,
        service: upcoming.service,
        petName: upcoming.petName || "your pup",
        groomer: groomerName(upcoming.groomerId as GroomerId),
        quotedPrice: getAppointmentBookedPrice(upcoming),
      }
    : null;
}

function buildDraftReply(contact: CrmContact, inboundBody: string): string {
  const name = contact.firstName || contact.fullName || "there";
  const lower = inboundBody.toLowerCase();
  if (/\b(book|schedule|appointment)\b/.test(lower)) {
    return `Hi ${name}! You can book online anytime: ${BOOK_URL} — or tell me your ZIP and pet size and I'll help.`;
  }
  if (/\b(price|cost|how much)\b/.test(lower)) {
    return `Hi ${name}! Our site prices are already 50% off list. Small full groom is ${formatPrice(110)}. Full menu: ${BOOK_URL}`;
  }
  if (/\b(cancel|reschedule)\b/.test(lower)) {
    return `Hi ${name}! For changes to an existing appointment, visit ${MY_APPT_URL} or reply with your preferred date/time.`;
  }
  return `Hi ${name}! Thanks for messaging Mobile Dog Salon. Book here: ${BOOK_URL} — How can we help with grooming today?`;
}

async function polishWithAi(
  draft: string,
  contact: CrmContact,
  inboundBody: string,
  config: MetaBotConfig
): Promise<string> {
  if (!config.useAiPolish) return draft;
  const openai = getOpenAI();
  if (!openai) return draft;

  const upcoming = await contactAppointmentContext(contact);
  const pricing = buildPublishedPricingFacts();
  const history = (await listInteractionsForContact(contact.id, 8))
    .filter((ix) => ix.channel === "meta" && ix.body)
    .map((ix) => `${ix.direction}: ${ix.body}`)
    .join("\n");

  const system = [
    config.systemPrompt,
    config.customLogic,
    `Pricing facts: ${pricing}`,
    upcoming
      ? `Upcoming appointment: ${upcoming.startAt} · ${upcoming.service} · ${upcoming.petName} · ${upcoming.groomer}`
      : "No upcoming appointment on file.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: `Customer name: ${contact.fullName || contact.firstName || "Unknown"}\nRecent thread:\n${history}\n\nLatest inbound: ${inboundBody}\n\nDraft reply:\n${draft}`,
      },
    ],
    max_tokens: 220,
    temperature: 0.4,
  });

  return completion.choices[0]?.message?.content?.trim() || draft;
}

export async function simulateMetaBotReply(options: {
  contact: CrmContact;
  inboundBody: string;
}): Promise<{ body: string; mode: string; draftOnly: boolean }> {
  const config = await readMetaBotConfig();
  const draft = buildDraftReply(options.contact, options.inboundBody);
  const body = await polishWithAi(draft, options.contact, options.inboundBody, config);
  const allowed = options.contact.metaPsid
    ? psidAllowedForMetaBot(options.contact.metaPsid, config)
    : config.mode === "test";
  return {
    body,
    mode: config.mode,
    draftOnly: !allowed || !config.enabled,
  };
}

export async function handleInboundMetaWithBot(options: {
  contact: CrmContact;
  inboundBody: string;
}): Promise<{ replied: boolean; body?: string; draftOnly?: boolean }> {
  const config = await readMetaBotConfig();
  if (!config.enabled || !options.contact.botEnabled) {
    return { replied: false };
  }

  const psid = options.contact.metaPsid?.trim();
  if (!psid) return { replied: false };

  const allowed = psidAllowedForMetaBot(psid, config);
  const draft = buildDraftReply(options.contact, options.inboundBody);
  const body = await polishWithAi(draft, options.contact, options.inboundBody, config);

  if (!allowed) {
    await recordBotMetaDm({ contact: options.contact, body, draftOnly: true });
    return { replied: false, body, draftOnly: true };
  }

  const sent = await sendMetaTextMessage({ psid, text: body });
  await recordBotMetaDm({
    contact: options.contact,
    body,
    metaMessageId: sent.messageId,
    draftOnly: !sent.ok,
  });
  return { replied: sent.ok, body, draftOnly: !sent.ok };
}
