/**
 * Quick local check of too-far route grouping against data/scheduling.json.
 * Usage: npx tsx scripts/test-too-far-routes.mjs
 */
import { readFileSync } from "node:fs";
import { listTooFarAppointments } from "../lib/scheduling/too-far-appointments.ts";

const data = JSON.parse(readFileSync("data/scheduling.json", "utf8"));
const now = new Date();

const { routes, isolated, tooFar, meta } = listTooFarAppointments(data.appointments, { now });

console.log("=== Too Far scan (future upcoming only) ===");
console.log("Meta:", meta);
console.log(`Total flagged: ${tooFar.length}`);
console.log("");

if (routes.length) {
  console.log(`Recommended routes (${routes.length}):`);
  for (const route of routes) {
    console.log(`\n  • ${route.areaLabel} (${route.groomerId})`);
    console.log(
      `    ${route.appointmentCount} visits on ${route.uniqueDays} day(s), spread ~${route.clusterSpreadMiles} mi`
    );
    for (const ap of route.appointments) {
      console.log(
        `      - ${ap.startAt.slice(0, 10)} ${ap.clientName} · ${ap.address} (${ap.distanceMiles} mi from base)`
      );
    }
  }
} else {
  console.log("No recommended routes found.");
}

if (isolated.length) {
  console.log(`\nIsolated (${isolated.length}):`);
  for (const ap of isolated) {
    console.log(
      `  - ${ap.startAt.slice(0, 10)} ${ap.groomerId} ${ap.clientName} · ${ap.address} (${ap.distanceMiles} mi)`
    );
  }
}
