/**
 * Test Go High Level credentials and list calendars.
 * Usage: node scripts/test-ghl-connection.mjs
 *
 * Requires in .env.local or environment:
 *   GHL_API_KEY
 *   GHL_LOCATION_ID
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvFile(name) {
  const path = resolve(process.cwd(), name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env.vercel.production");

const apiKey = process.env.GHL_API_KEY;
const locationId = process.env.GHL_LOCATION_ID;

if (!apiKey || !locationId) {
  console.error("Missing GHL_API_KEY or GHL_LOCATION_ID");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${apiKey}`,
  Version: "2021-07-28",
  Accept: "application/json",
};

async function main() {
  console.log("Testing Go High Level connection…");
  console.log("Location ID:", locationId);

  const calRes = await fetch(
    `https://services.leadconnectorhq.com/calendars/?locationId=${locationId}`,
    { headers }
  );

  if (!calRes.ok) {
    console.error("Calendar list failed:", calRes.status, await calRes.text());
    process.exit(1);
  }

  const calData = await calRes.json();
  const calendars = calData.calendars ?? calData.data ?? calData ?? [];

  console.log("\nCalendars (copy ID into GHL_CALENDAR_ID env var):");
  for (const cal of calendars) {
    console.log(`  - ${cal.name ?? cal.title ?? "Unnamed"} → ${cal.id}`);
  }

  if (calendars.length === 0) {
    console.log("  (none found — create a calendar in GHL → Calendars)");
  }

  console.log("\nConfigured env:");
  console.log("  GHL_CALENDAR_ID:", process.env.GHL_CALENDAR_ID ?? "(not set)");
  console.log("  GHL_CALENDAR_ID_MELANIE:", process.env.GHL_CALENDAR_ID_MELANIE ?? "(not set)");
  console.log("  GHL_CALENDAR_ID_DIAMOND:", process.env.GHL_CALENDAR_ID_DIAMOND ?? "(not set)");
  console.log("  GHL_BOOKING_WORKFLOW_ID:", process.env.GHL_BOOKING_WORKFLOW_ID ?? "(not set)");
  console.log("  GHL_WEBHOOK_URL:", process.env.GHL_WEBHOOK_URL ? "(set)" : "(not set)");

  console.log("\nGHL connection OK.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
