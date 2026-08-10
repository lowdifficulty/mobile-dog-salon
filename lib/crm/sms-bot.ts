import "server-only";
import OpenAI from "openai";
import { companyLegal } from "@/lib/company-legal";
import { readSchedulingData } from "@/lib/scheduling/store";
import { groomerName } from "@/lib/scheduling/groomers";
import type { GroomerId } from "@/lib/scheduling/types";
import { formatPhoneDisplay } from "@/lib/leads/normalize";
import type { CrmContact } from "./types";
import { recordBotSms } from "./messaging";
import { listInteractionsForContact } from "./store";

const BOOK_URL = `${companyLegal.siteUrl}/book`;
const MY_APPT_URL = `${companyLegal.siteUrl}/my-appointment`;

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  if (process.env.SMS_BOT_ENABLED === "0" || process.env.SMS_BOT_ENABLED === "false") {
    return null;
  }
  return new OpenAI({ apiKey });
}

export function isSmsBotEnabled(): boolean {
  if (process.env.SMS_BOT_ENABLED === "0" || process.env.SMS_BOT_ENABLED === "false") {
    return false;
  }
  // On by default for inbound follow-up; still works without OpenAI via rules.
  return true;
}

async function contactAppointmentContext(contact: CrmContact): Promise<{
  upcoming?: {
    startAt: string;
    service: string;
    petName: string;
    groomer: string;
    status: string;
  };
  recentPast?: {
    startAt: string;
    service: string;
    petName: string;
    groomer: string;
  };
  isAbandonedLead: boolean;
}> {
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
  const recentPast = mine
    .filter((a) => a.status === "confirmed" && new Date(a.startAt).getTime() < now)
    .sort((a, b) => b.startAt.localeCompare(a.startAt))[0];

  return {
    upcoming: upcoming
      ? {
          startAt: upcoming.startAt,
          service: upcoming.service,
          petName: upcoming.petName || "your pup",
          groomer: groomerName(upcoming.groomerId as GroomerId),
          status: upcoming.status,
        }
      : undefined,
    recentPast: recentPast
      ? {
          startAt: recentPast.startAt,
          service: recentPast.service,
          petName: recentPast.petName || "your pup",
          groomer: groomerName(recentPast.groomerId as GroomerId),
        }
      : undefined,
    isAbandonedLead:
      contact.status === "lead" || contact.tags.includes("abandoned-funnel"),
  };
}

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function ruleBasedReply(
  body: string,
  contact: CrmContact,
  ctx: Awaited<ReturnType<typeof contactAppointmentContext>>
): string {
  const text = body.trim().toLowerCase();
  const first = contact.firstName?.trim() || "there";

  if (/^(hi|hello|hey)\b/.test(text)) {
    if (ctx.upcoming) {
      return `Hi ${first}! This is Mobile Dog Salon. Your next visit for ${ctx.upcoming.petName} is ${formatWhen(ctx.upcoming.startAt)} with ${ctx.upcoming.groomer}. Reply STATUS for details, BOOK to schedule another, or HELP for help.`;
    }
    return `Hi ${first}! Thanks for texting Mobile Dog Salon. Reply BOOK to schedule, STATUS for your appointment, or call ${companyLegal.businessPhoneDisplay}.`;
  }

  if (/\b(status|when|appointment|appt|confirm)\b/.test(text)) {
    if (ctx.upcoming) {
      return `You're booked: ${ctx.upcoming.petName} — ${ctx.upcoming.service} with ${ctx.upcoming.groomer} on ${formatWhen(ctx.upcoming.startAt)}. Manage online: ${MY_APPT_URL} Reply STOP to opt out.`;
    }
    if (ctx.recentPast) {
      return `I don't see an upcoming visit. Your last one was ${formatWhen(ctx.recentPast.startAt)} for ${ctx.recentPast.petName}. Ready to rebook? ${BOOK_URL}`;
    }
    return `I don't see an upcoming appointment on this number. Book here: ${BOOK_URL} or call ${companyLegal.businessPhoneDisplay}.`;
  }

  if (/\b(book|schedule|appointment|rebook|reserve)\b/.test(text)) {
    if (ctx.isAbandonedLead) {
      return `Happy to help you finish booking, ${first}! Pick a time here: ${BOOK_URL} Prefer a call? ${companyLegal.businessPhoneDisplay}`;
    }
    return `Book online anytime: ${BOOK_URL} Or reply with a preferred day/time and a groomer will follow up.`;
  }

  if (/\b(cancel|reschedule|move|change)\b/.test(text)) {
    return `To cancel or reschedule, use ${MY_APPT_URL} or call/text ${companyLegal.businessPhoneDisplay}. We'll help ASAP.`;
  }

  if (/\b(price|cost|how much|rate)\b/.test(text)) {
    return `Pricing depends on your pup's size and service. See options and book at ${BOOK_URL} — or ask us at ${companyLegal.businessPhoneDisplay}.`;
  }

  if (/\b(thanks|thank you|thx)\b/.test(text)) {
    return `You're welcome! We're here if you need anything. ${companyLegal.name}`;
  }

  if (ctx.upcoming) {
    return `Thanks for your message! Your next visit is ${formatWhen(ctx.upcoming.startAt)} with ${ctx.upcoming.groomer}. Reply STATUS, BOOK, or CANCEL for quick help — or call ${companyLegal.businessPhoneDisplay}.`;
  }

  if (ctx.isAbandonedLead) {
    return `Still thinking it over? We can come to you for mobile grooming. Finish booking in about a minute: ${BOOK_URL}`;
  }

  if (ctx.recentPast) {
    return `Great to hear from you! Want to book ${ctx.recentPast.petName}'s next spa day? ${BOOK_URL}`;
  }

  return `Thanks for texting ${companyLegal.name}! Reply BOOK to schedule, STATUS for appointment info, HELP for help, or call ${companyLegal.businessPhoneDisplay}.`;
}

async function maybeAiPolish(
  inbound: string,
  contact: CrmContact,
  draft: string,
  ctx: Awaited<ReturnType<typeof contactAppointmentContext>>
): Promise<string> {
  const openai = getOpenAI();
  if (!openai) return draft;

  const history = await listInteractionsForContact(contact.id, 8);
  const recent = history
    .filter((i) => i.channel === "sms" && i.body)
    .slice(-6)
    .map((i) => `${i.direction}/${i.actor}: ${i.body}`)
    .join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 180,
      messages: [
        {
          role: "system",
          content: `You are the Mobile Dog Salon SMS follow-up assistant. Write ONE short SMS reply (max 320 chars). Be warm, clear, and actionable. Never give vet advice. Include a booking or my-appointment link when useful. If the draft is fine, return it lightly edited. Do not use markdown.`,
        },
        {
          role: "user",
          content: [
            `Contact: ${contact.fullName || contact.phone} (${formatPhoneDisplay(contact.phone)})`,
            `Status: ${contact.status}`,
            `Context: ${JSON.stringify(ctx)}`,
            `Recent thread:\n${recent || "(none)"}`,
            `Customer just said: ${inbound}`,
            `Draft reply: ${draft}`,
            `Return only the final SMS text.`,
          ].join("\n"),
        },
      ],
    });
    const text = completion.choices[0]?.message?.content?.trim();
    if (text && text.length <= 480) return text;
  } catch (err) {
    console.error("SMS bot AI polish failed:", err);
  }
  return draft;
}

export type SmsBotHandleResult = {
  replied: boolean;
  body?: string;
};

const COMPLIANCE_KEYWORDS = new Set([
  "STOP",
  "START",
  "HELP",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
  "UNSTOP",
  "YES",
  "INFO",
]);

/**
 * Generate an SMS chatbot reply for lead / appointment follow-up.
 * Returns TwiML-ready text; caller sends/logs. Skips compliance keywords.
 */
export async function handleInboundSmsWithBot(options: {
  contact: CrmContact;
  inboundBody: string;
  /** When true (default), log the bot reply onto the CRM timeline. */
  record?: boolean;
}): Promise<SmsBotHandleResult> {
  if (!isSmsBotEnabled() || options.contact.botEnabled === false) {
    return { replied: false };
  }

  const keyword = options.inboundBody.trim().split(/\s+/)[0]?.toUpperCase() ?? "";
  if (COMPLIANCE_KEYWORDS.has(keyword)) {
    return { replied: false };
  }

  const ctx = await contactAppointmentContext(options.contact);
  const draft = ruleBasedReply(options.inboundBody, options.contact, ctx);
  const body = await maybeAiPolish(options.inboundBody, options.contact, draft, ctx);

  if (options.record !== false) {
    await recordBotSms({ contact: options.contact, body });
  }

  return { replied: true, body };
}

/** Build a proactive follow-up SMS for abandoned leads (not auto-sent). */
export function buildLeadFollowUpSms(contact: CrmContact): string {
  const first = contact.firstName?.trim() || "there";
  const pet = contact.pets.find((p) => p.petName)?.petName;
  if (pet) {
    return `Hi ${first} — still want us to pamper ${pet}? Mobile Dog Salon comes to you. Book here: ${BOOK_URL} Reply STOP to opt out.`;
  }
  return `Hi ${first} — Mobile Dog Salon here! Finish booking your mobile groom in a minute: ${BOOK_URL} Reply STOP to opt out.`;
}

/** Build a proactive post-appointment rebook SMS (not auto-sent). */
export function buildAppointmentFollowUpSms(contact: CrmContact): string {
  const first = contact.firstName?.trim() || "there";
  const pet = contact.pets.find((p) => p.petName)?.petName || "your pup";
  return `Hi ${first}! Hope ${pet} loved their spa day. Ready for the next one? Book: ${BOOK_URL} Reply STOP to opt out.`;
}
