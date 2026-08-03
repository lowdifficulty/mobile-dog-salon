/**
 * Snapshot live scheduling + leads from production into data/*.json for local QA.
 * Usage: npm run pull:prod
 *        SMOKE_BASE_URL=https://mobiledog-salon.com npm run pull:prod
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const BASE = (process.env.SMOKE_BASE_URL || "https://mobiledog-salon.com").replace(/\/$/, "");
const MELANIE_PASSWORD = process.env.SCHEDULING_PASSWORD_MELANIE || "Licky2026!!";
const GROOMERS = ["melanie", "diamond"];
const LEAD_VIEWS = ["scheduled", "complete", "abandoned", "cold_storage"];

async function request(path, { method = "GET", body, cookie } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const legacy = res.headers.get("set-cookie");
  const cookies = [...setCookie, legacy].filter(Boolean);
  return { res, json, cookies };
}

function mergeCookies(existing, newCookies) {
  const jar = new Map();
  for (const part of (existing || "").split(";")) {
    const [k, v] = part.trim().split("=");
    if (k && v) jar.set(k, v);
  }
  for (const c of newCookies) {
    const first = c.split(";")[0];
    const [k, v] = first.split("=");
    if (k && v) jar.set(k.trim(), v);
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function writeJson(relativePath, data) {
  const full = join(process.cwd(), relativePath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  console.log(`Pulling production data from ${BASE} ...`);

  const login = await request("/api/auth/login", {
    method: "POST",
    body: { role: "groomer", username: "melanie", password: MELANIE_PASSWORD },
  });

  if (!login.res.ok) {
    console.error("Staff login failed:", login.json?.error ?? login.res.status);
    process.exit(1);
  }

  const cookie = mergeCookies("", login.cookies);
  const availability = [];

  for (const groomerId of GROOMERS) {
    const res = await request(
      `/api/staff/availability?groomerId=${groomerId}&edit=1`,
      { cookie }
    );
    if (!res.res.ok) {
      console.error(`Availability pull failed for ${groomerId}:`, res.json?.error ?? res.res.status);
      process.exit(1);
    }
    availability.push(...(res.json?.availability ?? []));
  }

  const apptRes = await request("/api/staff/appointments?filter=all", { cookie });
  if (!apptRes.res.ok) {
    console.error("Appointments pull failed:", apptRes.json?.error ?? apptRes.res.status);
    process.exit(1);
  }

  const appointments = apptRes.json?.appointments ?? [];
  writeJson("data/scheduling.json", { availability, appointments });

  const leadsById = new Map();
  for (const view of LEAD_VIEWS) {
    const res = await request(`/api/staff/leads?view=${view}`, { cookie });
    if (!res.res.ok) {
      console.error(`Leads pull failed (${view}):`, res.json?.error ?? res.res.status);
      process.exit(1);
    }
    for (const lead of res.json?.leads ?? []) {
      leadsById.set(lead.id, lead);
    }
  }

  writeJson("data/leads.json", { leads: [...leadsById.values()] });

  console.log(`✓ data/scheduling.json — ${availability.length} availability day(s), ${appointments.length} appointment(s)`);
  console.log(`✓ data/leads.json — ${leadsById.size} lead(s)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
