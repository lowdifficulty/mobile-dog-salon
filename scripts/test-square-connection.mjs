import { readFileSync } from "node:fs";
import { SquareClient, SquareEnvironment } from "square";

try {
  const envPath = new URL("../.env.local", import.meta.url);
  const envFile = readFileSync(envPath, "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key && value) process.env[key] = value;
  }
} catch {
  // use existing env
}

const token = process.env.SQUARE_ACCESS_TOKEN?.trim();
const applicationId = process.env.SQUARE_APPLICATION_ID?.trim();
const locationIdFromEnv = process.env.SQUARE_LOCATION_ID?.trim();
const environment =
  process.env.SQUARE_ENVIRONMENT === "production"
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;

if (!token) {
  console.error("Set SQUARE_ACCESS_TOKEN in .env.local or the environment.");
  process.exit(1);
}

if (!applicationId) {
  console.error("Set SQUARE_APPLICATION_ID.");
  process.exit(1);
}

const client = new SquareClient({ token, environment });
const response = await client.locations.list();
const locations = response.locations ?? [];
const active = locations.filter((loc) => loc.id && (loc.status === "ACTIVE" || !loc.status));

console.log("Square connection OK");
console.log(`Mode: ${environment === SquareEnvironment.Production ? "production" : "sandbox"}`);
console.log(`Application ID: ${applicationId.slice(0, 8)}…${applicationId.slice(-4)}`);

if (locationIdFromEnv) {
  console.log(`Location ID (env): ${locationIdFromEnv}`);
} else if (active.length) {
  console.log("Active locations:");
  for (const loc of active) {
    console.log(`  ${loc.id} | ${loc.name ?? "unnamed"}`);
  }
  console.log(`Tip: set SQUARE_LOCATION_ID=${active[0].id}`);
} else {
  console.error("No active Square locations found. Set SQUARE_LOCATION_ID.");
  process.exit(1);
}

console.log("");
console.log("Webhook URL (optional): https://mobiledog-salon.com/api/webhooks/square");
