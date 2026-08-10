import { NextResponse } from "next/server";
import twilio from "twilio";
import { companyLegal } from "@/lib/company-legal";
import { recordSmsOptIn, recordSmsOptOut } from "@/lib/notifications/sms-opt-out";
import { ensureCrmSeeded } from "@/lib/crm/seed";
import { recordInboundSms } from "@/lib/crm/messaging";
import { handleInboundSmsWithBot } from "@/lib/crm/sms-bot";

const { name, businessPhoneDisplay, contactEmail } = companyLegal;

function twiml(message?: string): NextResponse {
  const response = new twilio.twiml.MessagingResponse();
  if (message) response.message(message);
  return new NextResponse(response.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}

/** Twilio webhook for inbound SMS — compliance keywords + CRM inbox + SMS bot. */
export async function POST(request: Request) {
  const formData = await request.formData();
  const rawBody = formData.get("Body")?.toString().trim() ?? "";
  const from = formData.get("From")?.toString() ?? "";
  const messageSid = formData.get("MessageSid")?.toString();
  const keyword = rawBody.split(/\s+/)[0]?.toUpperCase() ?? "";

  try {
    await ensureCrmSeeded();
  } catch (err) {
    console.error("CRM seed on inbound SMS failed:", err);
  }

  if (keyword === "STOP" || keyword === "UNSUBSCRIBE" || keyword === "CANCEL" || keyword === "END" || keyword === "QUIT") {
    await recordSmsOptOut(from);
    try {
      await recordInboundSms({ from, body: rawBody, twilioSid: messageSid });
    } catch (err) {
      console.error("CRM inbound log failed:", err);
    }
    return twiml(`${name}: You are unsubscribed and will no longer receive SMS messages. Reply START to resubscribe.`);
  }

  if (keyword === "START" || keyword === "UNSTOP" || keyword === "YES") {
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

  if (keyword === "HELP" || keyword === "INFO") {
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
    `${name}: Reply HELP for help, STOP to opt out, BOOK for booking help, or schedule online at ${companyLegal.siteUrl}/book`
  );
}
