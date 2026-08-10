import "server-only";
import twilio from "twilio";
import {
  getTwilioClient,
  getTwilioStaffCallbackNumber,
  getTwilioVoiceCallerId,
} from "./twilio-client";
import { normalizePhoneE164 } from "./twilio";
import { resolveTwilioVoiceForward } from "./twilio-runtime-config";

export type StartOutboundCallResult = {
  ok: boolean;
  sid?: string;
  error?: string;
};

/**
 * Click-to-call: Twilio dials the staff phone first, then bridges to the customer.
 * Staff number can be passed per-request or via TWILIO_STAFF_CALLBACK_NUMBER.
 */
export async function startOutboundBridgeCall(options: {
  customerPhone: string;
  staffPhone?: string;
  statusCallbackUrl: string;
  twimlUrl: string;
}): Promise<StartOutboundCallResult> {
  const client = await getTwilioClient();
  const callerId = await getTwilioVoiceCallerId();
  const staffPhone =
    normalizePhoneE164(options.staffPhone || "") ||
    normalizePhoneE164((await getTwilioStaffCallbackNumber()) || "");
  const customerPhone = normalizePhoneE164(options.customerPhone);

  if (!client || !callerId) {
    return { ok: false, error: "Twilio Voice is not configured" };
  }
  if (!staffPhone) {
    return {
      ok: false,
      error:
        "Staff callback number required (pass staffPhone or set TWILIO_STAFF_CALLBACK_NUMBER)",
    };
  }
  if (!customerPhone) {
    return { ok: false, error: "Invalid customer phone number" };
  }

  try {
    const call = await client.calls.create({
      to: staffPhone,
      from: callerId,
      url: `${options.twimlUrl}?customer=${encodeURIComponent(customerPhone)}`,
      statusCallback: options.statusCallbackUrl,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
    });
    return { ok: true, sid: call.sid };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Call failed";
    console.error("Twilio outbound call failed:", error);
    return { ok: false, error };
  }
}

export async function buildBridgeTwiml(customerPhone: string): Promise<string> {
  const response = new twilio.twiml.VoiceResponse();
  response.say(
    { voice: "alice" },
    "Connecting you to the Mobile Dog Salon customer. Please hold."
  );
  const dial = response.dial({
    callerId: (await getTwilioVoiceCallerId()) || undefined,
    timeout: 30,
  });
  dial.number(customerPhone);
  return response.toString();
}

export async function buildInboundVoiceTwiml(options?: {
  forwardTo?: string;
}): Promise<string> {
  const response = new twilio.twiml.VoiceResponse();
  const forwardTo =
    normalizePhoneE164(options?.forwardTo || "") ||
    normalizePhoneE164((await getTwilioStaffCallbackNumber()) || "") ||
    normalizePhoneE164((await resolveTwilioVoiceForward()) || "");

  response.say(
    { voice: "alice" },
    "Thank you for calling Mobile Dog Salon. Good dogs take baths."
  );

  if (forwardTo) {
    response.say({ voice: "alice" }, "Please hold while we connect you.");
    const dial = response.dial({
      callerId: (await getTwilioVoiceCallerId()) || undefined,
      timeout: 25,
    });
    dial.number(forwardTo);
  } else {
    response.say(
      { voice: "alice" },
      "We are unable to take your call right now. Please text this number or book online at mobile dog dash salon dot com slash book. Goodbye."
    );
    response.hangup();
  }

  return response.toString();
}

export function mapTwilioCallStatus(
  status: string
):
  | "queued"
  | "ringing"
  | "in-progress"
  | "completed"
  | "busy"
  | "no-answer"
  | "canceled"
  | "failed" {
  switch (status.toLowerCase()) {
    case "queued":
      return "queued";
    case "ringing":
      return "ringing";
    case "in-progress":
      return "in-progress";
    case "completed":
      return "completed";
    case "busy":
      return "busy";
    case "no-answer":
      return "no-answer";
    case "canceled":
    case "cancelled":
      return "canceled";
    default:
      return "failed";
  }
}
