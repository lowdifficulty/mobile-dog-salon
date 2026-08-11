/**
 * Point the Twilio phone number at Mobile Dog Salon webhooks.
 *
 * Usage:
 *   node scripts/configure-twilio-webhooks.mjs
 *   node scripts/configure-twilio-webhooks.mjs .env.production.local
 *
 * Requires TWILIO_ACCOUNT_SID, TWILIO_FROM_NUMBER, and either API key or auth token.
 */

import { readFileSync } from "fs";

const envFile = process.argv[2] || ".env.local";
try {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  /* optional env file */
}

const { default: twilio } = await import("twilio");

const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
const key = process.env.TWILIO_API_KEY_SID?.trim();
const secret = process.env.TWILIO_API_KEY_SECRET?.trim();
const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
const from = process.env.TWILIO_FROM_NUMBER?.trim();
const base =
  process.env.TWILIO_WEBHOOK_BASE_URL?.trim()?.replace(/\/$/, "") ||
  "https://mobiledog-salon.com";

if (!sid || !from) {
  console.error("Set TWILIO_ACCOUNT_SID and TWILIO_FROM_NUMBER");
  process.exit(1);
}

const client =
  key && secret
    ? twilio(key, secret, { accountSid: sid })
    : authToken
      ? twilio(sid, authToken)
      : null;

if (!client) {
  console.error("Set TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET or TWILIO_AUTH_TOKEN");
  process.exit(1);
}

const expected = {
  smsUrl: `${base}/api/twilio/inbound`,
  voiceUrl: `${base}/api/twilio/voice`,
  voiceStatusUrl: `${base}/api/twilio/voice/status`,
};

const numbers = await client.incomingPhoneNumbers.list({ phoneNumber: from, limit: 1 });
const record = numbers[0];
if (!record) {
  console.error(`No incoming phone number found for ${from}`);
  process.exit(1);
}

console.log("Before:", {
  smsUrl: record.smsUrl,
  voiceUrl: record.voiceUrl,
  smsApplicationSid: record.smsApplicationSid,
  voiceApplicationSid: record.voiceApplicationSid,
});

await client.incomingPhoneNumbers(record.sid).update({
  smsUrl: expected.smsUrl,
  smsMethod: "POST",
  smsApplicationSid: "",
  voiceUrl: expected.voiceUrl,
  voiceMethod: "POST",
  voiceApplicationSid: "",
  statusCallback: expected.voiceStatusUrl,
  statusCallbackMethod: "POST",
});

const updated = await client.incomingPhoneNumbers(record.sid).fetch();
console.log("After:", {
  phone: updated.phoneNumber,
  smsUrl: updated.smsUrl,
  voiceUrl: updated.voiceUrl,
  statusCallback: updated.statusCallback,
  smsConnected: (updated.smsUrl || "").replace(/\/$/, "") === expected.smsUrl,
  voiceConnected: (updated.voiceUrl || "").replace(/\/$/, "") === expected.voiceUrl,
});

console.log("\nExpected webhooks:", expected);
