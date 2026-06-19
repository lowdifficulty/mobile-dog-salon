/**
 * Print Twilio A2P campaign registration copy for Mobile Dog Salon.
 * Usage: node scripts/print-a2p-campaign-info.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Load TS modules via dynamic import from compiled context — use inline copy from files
const a2pPath = path.join(root, "lib", "a2p.ts");
const legalPath = path.join(root, "lib", "company-legal.ts");

function extractExport(file, exportName) {
  const raw = readFileSync(file, "utf8");
  const match = raw.match(new RegExp(`export const ${exportName} = \`([\\s\\S]*?)\`;`));
  return match?.[1]?.replace(/\$\{[^}]+\}/g, (expr) => {
    if (expr.includes("name")) return "Mobile Dog Salon";
    if (expr.includes("siteUrl")) return "https://mobiledog-salon.com";
    if (expr.includes("legalRoutes.privacy")) return "/privacy-policy";
    if (expr.includes("legalRoutes.terms")) return "/terms-and-conditions";
    if (expr.includes("legalRoutes.book")) return "/book";
    if (expr.includes("businessPhoneDisplay")) return "(949) 755-8994";
    return "";
  });
}

const campaignId = readFileSync(legalPath, "utf8").match(/twilioCampaignId: "(.+?)"/)?.[1];

console.log("=== Mobile Dog Salon — Twilio A2P Registration ===\n");
console.log("Campaign ID:", campaignId ?? "(see lib/company-legal.ts)");
console.log("\n--- Privacy Policy URL ---");
console.log("https://mobiledog-salon.com/privacy-policy");
console.log("\n--- Terms & Conditions URL ---");
console.log("https://mobiledog-salon.com/terms-and-conditions");
console.log("\n--- Opt-in form URL ---");
console.log("https://mobiledog-salon.com/book");
console.log("\n--- Message Flow ---");
console.log(extractExport(a2pPath, "smsMessageFlowDescription"));
console.log("\n--- Sample confirmation message ---");
console.log(extractExport(a2pPath, "sampleConfirmationSms"));
console.log("\n--- Sample reminder message ---");
console.log(extractExport(a2pPath, "sampleReminderSms"));
console.log("\n--- Twilio inbound webhook (STOP/HELP/START) ---");
console.log("https://mobiledog-salon.com/api/twilio/inbound");
console.log("\n--- From number ---");
console.log("+19497558994");
