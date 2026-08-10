import "server-only";
import twilio from "twilio";

export function getTwilioClient(): twilio.Twilio | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim();
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();

  if (accountSid && apiKeySid && apiKeySecret) {
    return twilio(apiKeySid, apiKeySecret, { accountSid });
  }
  if (accountSid && authToken) {
    return twilio(accountSid, authToken);
  }
  return null;
}

export function getTwilioFromNumber(): string | null {
  return process.env.TWILIO_FROM_NUMBER?.trim() || null;
}

export function getTwilioAuthToken(): string | null {
  return process.env.TWILIO_AUTH_TOKEN?.trim() || null;
}

export function getTwilioVoiceCallerId(): string | null {
  return (
    process.env.TWILIO_VOICE_CALLER_ID?.trim() ||
    process.env.TWILIO_FROM_NUMBER?.trim() ||
    null
  );
}

/** Staff phone that receives click-to-call bridge legs. */
export function getTwilioStaffCallbackNumber(): string | null {
  return process.env.TWILIO_STAFF_CALLBACK_NUMBER?.trim() || null;
}

export function isTwilioConfigured(): boolean {
  return Boolean(getTwilioClient() && getTwilioFromNumber());
}

export function twilioStatus(): {
  configured: boolean;
  hasFromNumber: boolean;
  hasVoice: boolean;
  mode: "api-key" | "auth-token" | "missing";
} {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim();
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = getTwilioFromNumber();

  let mode: "api-key" | "auth-token" | "missing" = "missing";
  if (accountSid && apiKeySid && apiKeySecret) mode = "api-key";
  else if (accountSid && authToken) mode = "auth-token";

  return {
    configured: mode !== "missing" && Boolean(from),
    hasFromNumber: Boolean(from),
    hasVoice: mode !== "missing" && Boolean(getTwilioVoiceCallerId()),
    mode,
  };
}
