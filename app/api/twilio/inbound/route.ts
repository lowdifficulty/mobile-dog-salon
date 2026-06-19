import { NextResponse } from "next/server";
import twilio from "twilio";
import { companyLegal } from "@/lib/company-legal";
import { recordSmsOptIn, recordSmsOptOut } from "@/lib/notifications/sms-opt-out";

const { name, businessPhoneDisplay, contactEmail } = companyLegal;

function twiml(message: string): NextResponse {
  const response = new twilio.twiml.MessagingResponse();
  response.message(message);
  return new NextResponse(response.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}

/** Twilio webhook for inbound SMS — START / STOP / HELP keyword handling. */
export async function POST(request: Request) {
  const formData = await request.formData();
  const rawBody = formData.get("Body")?.toString().trim() ?? "";
  const from = formData.get("From")?.toString() ?? "";
  const keyword = rawBody.split(/\s+/)[0]?.toUpperCase() ?? "";

  if (keyword === "STOP" || keyword === "UNSUBSCRIBE" || keyword === "CANCEL" || keyword === "END" || keyword === "QUIT") {
    await recordSmsOptOut(from);
    return twiml(`${name}: You are unsubscribed and will no longer receive SMS messages. Reply START to resubscribe.`);
  }

  if (keyword === "START" || keyword === "UNSTOP" || keyword === "YES") {
    await recordSmsOptIn(from);
    return twiml(
      `${name}: You're subscribed to appointment updates at this number. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.`
    );
  }

  if (keyword === "HELP" || keyword === "INFO") {
    return twiml(
      `${name} SMS help: We send booking confirmations and appointment reminders. Msg & data rates may apply. Call/text ${businessPhoneDisplay} or email ${contactEmail}. Reply STOP to opt out.`
    );
  }

  return twiml(
    `${name}: Reply HELP for help, STOP to opt out, or book online at ${companyLegal.siteUrl}/book`
  );
}
