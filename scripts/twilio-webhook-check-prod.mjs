import { readFileSync } from "fs";
import twilio from "twilio";

const envFile = process.argv[2] || ".env.production.local";
for (const line of readFileSync(envFile, "utf8").split("\n")) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m && process.env[m[1]] === undefined) {
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const sid = process.env.TWILIO_ACCOUNT_SID;
const key = process.env.TWILIO_API_KEY_SID;
const secret = process.env.TWILIO_API_KEY_SECRET;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_FROM_NUMBER;

if (!sid || !from) {
  console.log("missing sid or from");
  process.exit(1);
}

const client =
  key && secret
    ? twilio(key, secret, { accountSid: sid })
    : authToken
      ? twilio(sid, authToken)
      : null;

if (!client) {
  console.log("missing credentials");
  process.exit(1);
}

const expected = {
  sms: "https://mobiledog-salon.com/api/twilio/inbound",
  voice: "https://mobiledog-salon.com/api/twilio/voice",
  status: "https://mobiledog-salon.com/api/twilio/voice/status",
};

const nums = await client.incomingPhoneNumbers.list({ phoneNumber: from, limit: 1 });
const n = nums[0];
if (!n) {
  console.log("no number", from);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      phone: n.phoneNumber,
      sid: n.sid,
      smsUrl: n.smsUrl,
      smsMethod: n.smsMethod,
      smsConnected: (n.smsUrl || "").replace(/\/$/, "") === expected.sms,
      voiceUrl: n.voiceUrl,
      voiceMethod: n.voiceMethod,
      voiceConnected: (n.voiceUrl || "").replace(/\/$/, "") === expected.voice,
      statusCallback: n.statusCallback,
      expected,
    },
    null,
    2
  )
);
