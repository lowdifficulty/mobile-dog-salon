/**
 * Trigger the reminder cron (local or production).
 *
 * Usage:
 *   node scripts/run-reminders.mjs
 *   SMOKE_BASE_URL=https://mobiledog-salon.com node scripts/run-reminders.mjs
 *
 * Requires CRON_SECRET in .env.local or environment.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  const raw = readFileSync(file, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET?.trim();

if (!secret) {
  console.error("Set CRON_SECRET in .env.local or your environment.");
  process.exit(1);
}

const url = `${base.replace(/\/$/, "")}/api/cron/reminders`;
console.log("POSTing to", url);

const res = await fetch(url, {
  headers: { Authorization: `Bearer ${secret}` },
});

const body = await res.text();
console.log(res.status, body);

if (!res.ok) process.exit(1);
