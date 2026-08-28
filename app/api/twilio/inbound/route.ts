import { NextResponse } from "next/server";
import twilio from "twilio";
import { companyLegal } from "@/lib/company-legal";
import { recordSmsOptIn, recordSmsOptOut } from "@/lib/notifications/sms-opt-out";
import {
  isSmsHelpMessage,
  isSmsOptInMessage,
  isSmsOptOutMessage,
} from "@/lib/notifications/sms-compliance";
import { ensureCrmSeeded } from "@/lib/crm/seed";
import { recordInboundSms } from "@/lib/crm/messaging";
import { handleInboundSmsWithBot } from "@/lib/crm/sms-bot";
import { findContactByPhone } from "@/lib/crm/store";
import {
  isTeamParticipantPhone,
  recordTeamInboundSms,
} from "@/lib/crm/team-sms";
import { hasActiveSmsBotSession } from "@/lib/crm/sms-bot-session";
import { smsStatusCallbackUrl } from "@/lib/notifications/twilio";

const { name, businessPhoneDisplay, contactEmail } = companyLegal;

async function twiml(message?: string): Promise<NextResponse> {
  const response = new twilio.twiml.MessagingResponse();
  if (message) {
    const statusCallback = await smsStatusCallbackUrl();
    if (statusCallback) {
      response.message({ action: statusCallback, statusCallback }, message);
    } else {
      response.message(message);
    }
  }
  return new NextResponse(response.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}

function isSmsOptOut(body: string): boolean {
  return isSmsOptOutMessage(body);
}

function isSmsOptIn(body: string): boolean {
  return isSmsOptInMessage(body);
}

function isSmsHelp(body: string): boolean {
  return isSmsHelpMessage(body);
}

/** Twilio webhook for inbound SMS — compliance keywords + CRM inbox + SMS bot. */
export async function POST(request: Request) {
  const formData = await request.formData();
  const rawBody = formData.get("Body")?.toString().trim() ?? "";
  const from = formData.get("From")?.toString() ?? "";
  const messageSid = formData.get("MessageSid")?.toString();

  try {
    await ensureCrmSeeded();
  } catch (err) {
    console.error("CRM seed on inbound SMS failed:", err);
  }

  const existingContact = await findContactByPhone(from);
  const inBotFlow = hasActiveSmsBotSession(existingContact?.smsBotSession);
  const teamInbound = isTeamParticipantPhone(from);

  if (teamInbound) {
    try {
      await recordTeamInboundSms({ from, body: rawBody, twilioSid: messageSid });
    } catch (err) {
      console.error("Team inbound SMS failed:", err);
    }
    return twiml();
  }

  if (isSmsOptOut(rawBody)) {
    await recordSmsOptOut(from);
    try {
      await recordInboundSms({ from, body: rawBody, twilioSid: messageSid });
    } catch (err) {
      console.error("CRM inbound log failed:", err);
    }
    return twiml(`${name}: You are unsubscribed and will no longer receive SMS messages. Reply START to resubscribe.`);
  }

  if (!inBotFlow && isSmsOptIn(rawBody)) {
    await recordSmsOptIn(from);
    try {
      await recordInboundSms({ from, body: rawBody, twilioSid: messageSid });
    } catch (err) {
      console.error("CRM inbound log failed:", err);
    }
    return twiml(
      `${name}: You're subscribed to appointment updates at this number. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.`
    );
  }

  if (!inBotFlow && isSmsHelp(rawBody)) {
    try {
      await recordInboundSms({ from, body: rawBody, twilioSid: messageSid });
    } catch (err) {
      console.error("CRM inbound log failed:", err);
    }
    return twiml(
      `${name} SMS help: We send booking confirmations, appointment reminders, and follow-ups. Msg & data rates may apply. Call/text ${businessPhoneDisplay} or email ${contactEmail}. Reply STOP to opt out.`
    );
  }

  try {
    const { contact } = await recordInboundSms({
      from,
      body: rawBody,
      twilioSid: messageSid,
    });
    const bot = await handleInboundSmsWithBot({
      contact,
      inboundBody: rawBody,
    });
    if (bot.replied && bot.body) {
      return twiml(bot.body);
    }
  } catch (err) {
    console.error("Inbound SMS CRM/bot failed:", err);
  }

  return twiml(
    `${name}: Reply HELP for help, STOP to opt out, BOOK to schedule, or CANCEL to cancel your visit. ${companyLegal.siteUrl}/book`
  );
}
