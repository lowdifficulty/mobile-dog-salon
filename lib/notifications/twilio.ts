import "server-only";
import { getTwilioClient, getTwilioFromNumber } from "./twilio-client";

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

export type SendSmsResult = {
  ok: boolean;
  sid?: string;
  to?: string;
  error?: string;
};

/** Public Twilio SMS status callback URL, or undefined when the base is localhost. */
export async function smsStatusCallbackUrl(): Promise<string | undefined> {
  const { resolveTwilioWebhookBase } = await import("./twilio-runtime-config");
  const { companyLegal } = await import("@/lib/company-legal");
  const base =
    (await resolveTwilioWebhookBase())?.replace(/\/$/, "") ||
    companyLegal.siteUrl.replace(/\/$/, "");
  if (!base || /localhost|127\.0\.0\.1/i.test(base)) return undefined;
  return `${base}/api/twilio/sms/status`;
}

export async function sendSms(
  to: string,
  body: string,
  options?: { skipOptOutCheck?: boolean }
): Promise<SendSmsResult> {
  const from = await getTwilioFromNumber();
  const client = await getTwilioClient();
  const toE164 = normalizePhoneE164(to);

  if (!client || !from || !toE164) {
    if (!client) console.log("Twilio not configured (missing account/API credentials)");
    if (!from) console.log("TWILIO_FROM_NUMBER not set");
    if (!toE164) console.log("Invalid phone for SMS:", to);
    return {
      ok: false,
      error: !client
        ? "Twilio not configured"
        : !from
          ? "TWILIO_FROM_NUMBER not set"
          : "Invalid phone number",
    };
  }

  if (!options?.skipOptOutCheck) {
    const { isSmsOptedOut } = await import("./sms-opt-out");
    if (await isSmsOptedOut(toE164)) {
      console.log("SMS skipped — number opted out:", toE164);
      return { ok: false, to: toE164, error: "Number opted out" };
    }
  }

  try {
    const statusCallback = await smsStatusCallbackUrl();
    const message = await client.messages.create({
      from,
      to: toE164,
      body,
      ...(statusCallback ? { statusCallback } : {}),
    });
    return { ok: true, sid: message.sid, to: toE164 };
  } catch (err) {
    const error = err instanceof Error ? err.message : "SMS send failed";
    console.error("Twilio SMS send failed:", error);
    return { ok: false, to: toE164, error };
  }
}

export async function sendBookingSms(to: string, body: string): Promise<boolean> {
  const result = await sendSms(to, body);
  return result.ok;
}
