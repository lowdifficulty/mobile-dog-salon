/**
 * Verify Twilio credentials and list SMS-capable phone numbers.
 *
 * Usage (from project root):
 *   node scripts/test-twilio-connection.mjs
 *
 * Required env:
 *   TWILIO_ACCOUNT_SID (starts with AC...)
 *   TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET  OR  TWILIO_AUTH_TOKEN
 */

import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim();
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim();
const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
const fromNumber = process.env.TWILIO_FROM_NUMBER?.trim();

if (!accountSid) {
  console.error("Missing TWILIO_ACCOUNT_SID (find it at console.twilio.com, starts with AC...)");
  process.exit(1);
}

let client;
if (apiKeySid && apiKeySecret) {
  client = twilio(apiKeySid, apiKeySecret, { accountSid });
  console.log("Using API key credentials");
} else if (authToken) {
  client = twilio(accountSid, authToken);
  console.log("Using account SID + auth token");
} else {
  console.error("Set TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET or TWILIO_AUTH_TOKEN");
  process.exit(1);
}

try {
  const account = await client.api.accounts(accountSid).fetch();
  console.log("Account:", account.friendlyName, `(${account.status})`);

  const numbers = await client.incomingPhoneNumbers.list({ limit: 20 });
  if (numbers.length === 0) {
    console.log("No phone numbers on this account — buy one in Twilio Console → Phone Numbers");
  } else {
    console.log("\nSMS-capable numbers:");
    for (const n of numbers) {
      const marker = fromNumber === n.phoneNumber ? " ← TWILIO_FROM_NUMBER" : "";
      console.log(`  ${n.phoneNumber}  ${n.friendlyName || ""}${marker}`);
    }
    if (!fromNumber && numbers[0]) {
      console.log(`\nTip: set TWILIO_FROM_NUMBER=${numbers[0].phoneNumber}`);
    }
  }
} catch (err) {
  console.error("Twilio connection failed:", err.message);
  process.exit(1);
}
