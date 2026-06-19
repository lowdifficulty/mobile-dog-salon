import "server-only";
import twilio from "twilio";

function getTwilioClient(): twilio.Twilio | null {
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

/** Normalize US phone numbers to E.164 (+1XXXXXXXXXX). */
export function normalizePhoneE164(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    return digits.length >= 10 ? `+${digits}` : null;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits.length >= 10 ? `+${digits}` : null;
}

export async function sendBookingSms(to: string, body: string): Promise<boolean> {
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  const client = getTwilioClient();
  const toE164 = normalizePhoneE164(to);

  if (!client || !from || !toE164) {
    if (!client) console.log("Twilio not configured (missing account/API credentials)");
    if (!from) console.log("TWILIO_FROM_NUMBER not set");
    if (!toE164) console.log("Invalid phone for SMS:", to);
    return false;
  }

  await client.messages.create({ from, to: toE164, body });
  return true;
}
