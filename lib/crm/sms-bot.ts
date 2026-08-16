import "server-only";
import OpenAI from "openai";
import { companyLegal } from "@/lib/company-legal";
import { readSchedulingData } from "@/lib/scheduling/store";
import { groomerName } from "@/lib/scheduling/groomers";
import type { GroomerId } from "@/lib/scheduling/types";
import { formatPhoneDisplay } from "@/lib/leads/normalize";
import { getAppointmentBookedPrice } from "@/lib/booking/appointment-title";
import { formatPrice, buildPublishedPricingFacts } from "@/lib/pricing";
import type { CrmContact } from "./types";
import { recordBotSms } from "./messaging";
import {
  findContactById,
  listInteractionsForContact,
} from "./store";
import {
  phoneAllowedForSmsBot,
  readSmsBotConfig,
  type SmsBotConfig,
} from "./sms-bot-config";
import { runSmsBotActionFlow } from "./sms-bot-flow";
import { SMS_COMPLIANCE_KEYWORDS } from "@/lib/notifications/sms-compliance";

const BOOK_URL = `${companyLegal.siteUrl}/book`;
const MY_APPT_URL = `${companyLegal.siteUrl}/my-appointment`;

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export async function isSmsBotEnabled(): Promise<boolean> {
  if (process.env.SMS_BOT_ENABLED === "0" || process.env.SMS_BOT_ENABLED === "false") {
    return false;
  }
  const config = await readSmsBotConfig();
  return config.enabled;
}

async function contactAppointmentContext(contact: CrmContact): Promise<{
  upcoming?: {
    startAt: string;
    service: string;
    petName: string;
    groomer: string;
    status: string;
    quotedPrice: number | null;
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
          quotedPrice: getAppointmentBookedPrice(upcoming),
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
    return `You can text "cancel my appointment", "reschedule my appointment", or "book" and I'll walk you through it. Or use ${MY_APPT_URL} anytime.`;
  }

  if (/\b(price|cost|how much|rate|discount)\b/.test(text)) {
    const quoted = ctx.upcoming?.quotedPrice;
    if (quoted != null) {
      return `Your 50% discount is already in the booked price: ${formatPrice(quoted)} for this visit (that's half of list). Appointment ${formatWhen(ctx.upcoming!.startAt)} with ${ctx.upcoming!.groomer}.`;
    }
    return `Pricing depends on your pup's size and service. Small dog full grooms are $110 with the 50% discount (list $220). See options at ${BOOK_URL} or call ${companyLegal.businessPhoneDisplay}.`;
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

function looksLikeDoubleDiscountedPrice(text: string): boolean {
  return /\$55\b/.test(text) || /50%\s+discount applies to the \$1[0-3]0/i.test(text);
}

async function maybeAiPolish(
  inbound: string,
  contact: CrmContact,
  draft: string,
  ctx: Awaited<ReturnType<typeof contactAppointmentContext>>,
  config: SmsBotConfig
): Promise<string> {
  if (!config.useAiPolish) return draft;
  const openai = getOpenAI();
  if (!openai) return draft;

  const history = await listInteractionsForContact(contact.id, 8);
  const recent = history
    .filter((i) => i.channel === "sms" && i.body)
    .slice(-6)
    .map((i) => `${i.direction}/${i.actor}: ${i.body}`)
    .join("\n");

  const system = [
    config.systemPrompt,
    buildPublishedPricingFacts(),
    "Never quote $55 for a small full groom. $110 is already the 50% discounted price (list $220).",
    "Never say an appointment was moved, cancelled, or booked unless the draft already confirms that write happened.",
    config.customLogic ? `\nAdditional logic from admin:\n${config.customLogic}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 180,
      messages: [
        { role: "system", content: system },
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
    if (text && text.length <= 480 && !looksLikeDoubleDiscountedPrice(text)) return text;
  } catch (err) {
    console.error("SMS bot AI polish failed:", err);
  }
  return draft;
}

export type SmsBotHandleResult = {
  replied: boolean;
  body?: string;
  /** true when draft was logged but not sent (test mode / non-allowlisted) */
  suppressed?: boolean;
  mode?: "test" | "live";
};

async function composeSmsBotReply(
  contact: CrmContact,
  inboundBody: string,
  config: SmsBotConfig
): Promise<string> {
  const fresh = (await findContactById(contact.id)) ?? contact;
  const ctx = await contactAppointmentContext(fresh);
  const actionResult = await runSmsBotActionFlow(fresh, inboundBody, config);
  if (actionResult) return actionResult.reply;

  const draft = ruleBasedReply(inboundBody, fresh, ctx);
  return maybeAiPolish(inboundBody, fresh, draft, ctx, config);
}

/**
 * Generate an SMS chatbot reply for lead / appointment follow-up.
 * In test mode, only allowlisted phones receive a live TwiML reply.
 */
export async function handleInboundSmsWithBot(options: {
  contact: CrmContact;
  inboundBody: string;
  /** When true (default), log the bot reply onto the CRM timeline. */
  record?: boolean;
  /** Force sending even outside allowlist (admin simulator). */
  forceSend?: boolean;
}): Promise<SmsBotHandleResult> {
  const config = await readSmsBotConfig();
  if (!config.enabled || options.contact.botEnabled === false) {
    return { replied: false, mode: config.mode };
  }

  const keyword = options.inboundBody.trim().split(/\s+/)[0]?.toUpperCase() ?? "";
  if (SMS_COMPLIANCE_KEYWORDS.has(keyword) && options.inboundBody.trim().split(/\s+/).length === 1) {
    return { replied: false, mode: config.mode };
  }

  const body = await composeSmsBotReply(options.contact, options.inboundBody, config);

  const allowed =
    options.forceSend || phoneAllowedForSmsBot(options.contact.phone, config);

  if (!allowed) {
    return { replied: false, body, suppressed: true, mode: config.mode };
  }

  if (options.record !== false) {
    await recordBotSms({ contact: options.contact, body });
  }

  return { replied: true, body, mode: config.mode };
}

/** Admin playground — generate a reply without Twilio send. */
export async function simulateSmsBotReply(options: {
  contact: CrmContact;
  inboundBody: string;
}): Promise<{ body: string; mode: "test" | "live"; draftOnly: boolean }> {
  const config = await readSmsBotConfig();
  const body = await composeSmsBotReply(options.contact, options.inboundBody, config);
  return {
    body,
    mode: config.mode,
    draftOnly: config.mode === "test",
  };
}

export function buildLeadFollowUpSms(contact: CrmContact): string {
  const first = contact.firstName?.trim() || "there";
  const pet = contact.pets.find((p) => p.petName)?.petName;
  if (pet) {
    return `Hi ${first} — still want us to pamper ${pet}? Mobile Dog Salon comes to you. Book here: ${BOOK_URL} Reply STOP to opt out.`;
  }
  return `Hi ${first} — Mobile Dog Salon here! Finish booking your mobile groom in a minute: ${BOOK_URL} Reply STOP to opt out.`;
}

export function buildAppointmentFollowUpSms(contact: CrmContact): string {
  const first = contact.firstName?.trim() || "there";
  const pet = contact.pets.find((p) => p.petName)?.petName || "your pup";
  return `Hi ${first}! Hope ${pet} loved their spa day. Ready for the next one? Book: ${BOOK_URL} Reply STOP to opt out.`;
}
