import "server-only";

import { createLickyReply, type ChatMessage } from "@/lib/client/licky-chat";
import type { LickyActionContext } from "@/lib/client/licky-context";
import type { LickyGuestState } from "@/lib/client/licky-guest-types";
import { isVoiceAiEnabled } from "@/lib/client/licky-enabled";
import { listAppointmentsByPhone } from "@/lib/client/appointments";
import { buildLickyContextLines } from "@/lib/client/licky-session";
import { lickyCompletePendingBooking } from "@/lib/client/licky-actions";
import { lickyHandleRescheduleTurn } from "@/lib/client/licky-reschedule";
import { findClientByPhone } from "@/lib/payments/store";
import { findContactByPhone } from "@/lib/crm/store";
import {
  attachCallTranscript,
  findCallInteraction,
} from "@/lib/crm/call-recordings";
import { crmPublicBaseUrl } from "@/lib/crm/public-url";
import { getRedisClient } from "@/lib/scheduling/redis-client";
import { companyLegal } from "@/lib/company-legal";
import { groomerClientDisplayName } from "@/lib/scheduling/groomers";
import { getServiceLabel } from "@/lib/pricing";
import type { GroomerId } from "@/lib/scheduling/types";

const REDIS_PREFIX = "mds:licky-voice:";
const SESSION_TTL_SECONDS = 30 * 60;
const MAX_TURNS = 12;
const MAX_TIMEOUTS = 2;
const BOOK_SPOKEN = "mobile dog dash salon dot com slash book";

const VOICE_SYSTEM = `CHANNEL: live phone call with Licky.
Speak in short sentences. No markdown, no bullet lists, no URLs, no slot keys.
Spell the website as ${BOOK_SPOKEN}. If they already have an appointment and are confirming it, say yes and read the weekday, date, and time clearly.
When offering times, read at most three, then ask which one.
If you cannot help, tell them to text this same number or book at ${BOOK_SPOKEN}. Do not offer to transfer to a person.`;

type VoiceSession = {
  messages: ChatMessage[];
  guest: LickyGuestState;
  turn: number;
  timeouts: number;
  from: string;
};

const memorySessions = new Map<string, { session: VoiceSession; expiresAt: number }>();

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function lickyVoiceSpeechText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, BOOK_SPOKEN)
    .replace(/\/book\b/gi, BOOK_SPOKEN)
    .replace(/[`*_#>]/g, "")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 450);
}

function formatWhen(startAt: string): string {
  return new Date(startAt).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function emptySession(from: string): VoiceSession {
  return {
    messages: [],
    guest: { phone: from },
    turn: 0,
    timeouts: 0,
    from,
  };
}

async function readSession(callSid: string, from: string): Promise<VoiceSession> {
  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get<VoiceSession>(`${REDIS_PREFIX}${callSid}`);
    if (data) return { ...emptySession(from), ...data, from: data.from || from };
  } else {
    const row = memorySessions.get(callSid);
    if (row && row.expiresAt > Date.now()) return row.session;
  }
  return emptySession(from);
}

async function writeSession(callSid: string, session: VoiceSession): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    await redis.set(`${REDIS_PREFIX}${callSid}`, session, { ex: SESSION_TTL_SECONDS });
    return;
  }
  memorySessions.set(callSid, {
    session,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  });
}

async function gatherActionUrl(): Promise<string> {
  const base = await crmPublicBaseUrl();
  return `${base}/api/twilio/voice/licky`;
}

export async function buildLickyVoiceTwiml(options: {
  say: string;
  hangup?: boolean;
}): Promise<string> {
  const spoken = escapeXml(lickyVoiceSpeechText(options.say) || "How can I help?");
  if (options.hangup) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">${spoken}</Say><Hangup/></Response>`;
  }
  const action = escapeXml(await gatherActionUrl());
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">${spoken}</Say><Gather input="speech" language="en-US" speechTimeout="auto" timeout="6" action="${action}" method="POST" /><Say voice="alice">Sorry, I did not catch that.</Say><Redirect method="POST">${action}</Redirect></Response>`;
}

export async function describeUpcomingForPhone(from: string): Promise<string | null> {
  const now = Date.now();
  const upcoming = (await listAppointmentsByPhone(from).catch(() => [])).filter(
    (ap) => ap.status === "confirmed" && new Date(ap.startAt).getTime() >= now
  )[0];
  if (!upcoming) return null;
  const pet = upcoming.petName?.trim() || "your pup";
  const groomer = groomerClientDisplayName(upcoming.groomerId as GroomerId);
  return `${pet} on ${formatWhen(upcoming.startAt)} with ${groomer} for ${getServiceLabel(upcoming.service)}`;
}

export async function buildLickyVoiceGreetingTwiml(from?: string): Promise<string> {
  let say =
    "Hi, this is Licky with Mobile Dog Salon. How can I help you today?";
  if (from) {
    const upcoming = await describeUpcomingForPhone(from);
    const contact = await findContactByPhone(from).catch(() => null);
    const first = contact?.firstName?.trim();
    if (upcoming) {
      say = first
        ? `Hi ${first}, this is Licky with Mobile Dog Salon. I see you're booked: ${upcoming}. How can I help?`
        : `Hi, this is Licky with Mobile Dog Salon. I see you're booked: ${upcoming}. How can I help?`;
    } else if (first) {
      say = `Hi ${first}, this is Licky with Mobile Dog Salon. How can I help you today?`;
    }
  }
  return buildLickyVoiceTwiml({ say });
}

function wantsHangup(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (/\b(book|schedule|cancel|reschedule|appointment|appt|price|how much)\b/.test(t)) {
    return false;
  }
  return /^(goodbye|bye|thanks,? bye)\b/.test(t) ||
    /\b(that's all|that is all|nothing else|no thanks|i'm good|im good|hang up)\b/.test(t);
}

async function resolveVoiceContext(
  session: VoiceSession,
  from: string,
  callSid: string
): Promise<LickyActionContext> {
  const account = (await findClientByPhone(from).catch(() => null)) ?? undefined;
  const contact = await findContactByPhone(from).catch(() => null);
  const guest: LickyGuestState = {
    ...session.guest,
    phone: session.guest.phone || from,
    firstName: session.guest.firstName || contact?.firstName || account?.firstName,
    lastName: session.guest.lastName || contact?.lastName || account?.lastName,
  };
  session.guest = guest;

  const saveGuest = async (patch: Partial<LickyGuestState>) => {
    session.guest = { ...session.guest, ...patch };
  };

  return {
    account,
    guest,
    saveGuest,
    loggedIn: Boolean(account),
    holdOwnerId: `voice:${callSid}`,
    callerPhone: from,
  };
}

async function logVoiceTranscript(callSid: string, user: string, reply: string): Promise<void> {
  try {
    const existing = await findCallInteraction(callSid);
    const chunk = [`Caller: ${user}`, `Licky: ${reply}`].join("\n");
    const transcript = [existing?.transcript, chunk].filter(Boolean).join("\n");
    await attachCallTranscript({ callSid, transcript });
  } catch (err) {
    console.error("Licky voice transcript failed:", err);
  }
}

export async function handleLickyVoiceTurn(options: {
  callSid: string;
  from: string;
  speech: string;
}): Promise<string> {
  if (!isVoiceAiEnabled()) {
    return buildLickyVoiceTwiml({
      say: `Thanks for calling ${companyLegal.name}. Please text this number or book at ${BOOK_SPOKEN}. Goodbye.`,
      hangup: true,
    });
  }

  const from = options.from.trim() || "unknown";
  const session = await readSession(options.callSid, from);
  const speech = options.speech.trim();

  if (!speech) {
    session.timeouts += 1;
    await writeSession(options.callSid, session);
    if (session.timeouts >= MAX_TIMEOUTS) {
      return buildLickyVoiceTwiml({
        say: `I still cannot hear you. Text this number or book at ${BOOK_SPOKEN}. Goodbye.`,
        hangup: true,
      });
    }
    return buildLickyVoiceTwiml({
      say: "Sorry, I did not catch that. Please say that again.",
    });
  }

  session.timeouts = 0;
  session.turn += 1;
  session.messages.push({ role: "user", content: speech });

  if (session.turn > MAX_TURNS || wantsHangup(speech)) {
    await writeSession(options.callSid, session);
    await logVoiceTranscript(
      options.callSid,
      speech,
      "Thanks for calling. Goodbye."
    );
    return buildLickyVoiceTwiml({
      say: `Thanks for calling Mobile Dog Salon. Text this number anytime, or book at ${BOOK_SPOKEN}. Goodbye.`,
      hangup: true,
    });
  }

  const ctx = await resolveVoiceContext(session, from, options.callSid);
  ctx.conversationMessages = session.messages;
  ctx.request = undefined;

  try {
    const pendingReschedule = await lickyHandleRescheduleTurn(ctx, speech);
    const pending = pendingReschedule ?? (await lickyCompletePendingBooking(ctx, speech));
    let reply: string;
    if (pending?.reply) {
      reply = pending.reply;
    } else {
      const context = [VOICE_SYSTEM, await buildLickyContextLines(ctx)]
        .filter(Boolean)
        .join("\n\n");
      const result = await createLickyReply(session.messages, context, ctx);
      reply = result.reply;
    }

    session.messages.push({ role: "assistant", content: reply });
    await writeSession(options.callSid, session);
    await logVoiceTranscript(options.callSid, speech, reply);

    const hangup = wantsHangup(reply) && session.turn >= 2;
    return buildLickyVoiceTwiml({ say: reply, hangup });
  } catch (err) {
    console.error("Licky voice turn failed:", err);
    return buildLickyVoiceTwiml({
      say: `Sorry, I hit a snag. Please text this number or book at ${BOOK_SPOKEN}.`,
    });
  }
}

export { isVoiceAiEnabled };
