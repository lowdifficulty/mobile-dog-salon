/**
 * Push data/leads.json to production Redis (mds:leads).
 *
 * Requires KV_REST_API_URL and KV_REST_API_TOKEN in env
 * (e.g. vercel env pull .env.production.local --environment=production).
 *
 * Usage:
 *   node scripts/push-leads-redis.mjs
 *   node scripts/push-leads-redis.mjs --dry-run
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";

const DRY_RUN = process.argv.includes("--dry-run");
const envFiles = [".env.production.local", ".env.local"];

for (const file of envFiles) {
  const full = path.join(process.cwd(), file);
  if (!existsSync(full)) continue;
  for (const line of readFileSync(full, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;
if (!url || !token || url === '""' || token === '""') {
  console.error(
    "Missing KV_REST_API_URL / KV_REST_API_TOKEN. Pull production env first:\n" +
      "  vercel env pull .env.production.local --environment=production"
  );
  process.exit(1);
}

const leadsFile = path.join(process.cwd(), "data", "leads.json");
if (!existsSync(leadsFile)) {
  console.error("Missing data/leads.json — run import-heyflow-contacts.mjs first.");
  process.exit(1);
}

const data = JSON.parse(readFileSync(leadsFile, "utf8"));
const count = data.leads?.length ?? 0;
const heyflow = (data.leads ?? []).filter((l) => l.source === "heyflow").length;

if (DRY_RUN) {
  console.log(JSON.stringify({ dryRun: true, leads: count, heyflowSource: heyflow }, null, 2));
  process.exit(0);
}

const redis = new Redis({ url, token });
await redis.set("mds:leads", data);
console.log(
  JSON.stringify(
    {
      ok: true,
      key: "mds:leads",
      leads: count,
      heyflowSource: heyflow,
      nextStep:
        "Production admin → CRM → Refresh contacts (POST /api/admin/crm/contacts refresh)",
    },
    null,
    2
  )
);
