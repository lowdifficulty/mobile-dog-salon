/**
 * Restore Melanie's cancelled Thu Aug 13, 2026 appointments (allow overlaps).
 *
 * Usage:
 *   node scripts/restore-melanie-aug13.mjs
 *   SMOKE_BASE_URL=https://mobiledog-salon.com node scripts/restore-melanie-aug13.mjs
 */

const BASE = (process.env.SMOKE_BASE_URL || "https://mobiledog-salon.com").replace(
  /\/$/,
  ""
);
const ADMIN_USER = process.env.ADMIN_USER || "1";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1";
const TARGET_DATE = "2026-08-13";

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
  return { res, json, cookies: setCookie };
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

function pacificDate(iso) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

async function main() {
  console.log(`Restoring Melanie ${TARGET_DATE} cancelled appointments @ ${BASE}`);

  const login = await request("/api/auth/login", {
    method: "POST",
    body: { role: "admin", username: ADMIN_USER, password: ADMIN_PASSWORD },
  });
  if (!login.res.ok) {
    console.error("Admin login failed", login.json);
    process.exit(1);
  }
  const cookie = mergeCookies("", login.cookies);

  const list = await request("/api/admin/appointments?filter=all", { cookie });
  if (!list.res.ok) {
    console.error("Failed to load appointments", list.json);
    process.exit(1);
  }

  const targets = (list.json.appointments || []).filter((ap) => {
    if (ap.groomerId !== "melanie") return false;
    if (ap.status !== "cancelled") return false;
    return pacificDate(ap.startAt) === TARGET_DATE;
  });

  if (!targets.length) {
    console.log("No cancelled Melanie appointments found for that date.");
    return;
  }

  console.log(`Found ${targets.length} cancelled appointment(s) to restore:`);
  for (const ap of targets.sort((a, b) => a.startAt.localeCompare(b.startAt))) {
    console.log(
      `  ${ap.startAt} · ${ap.firstName} ${ap.lastName} · ${ap.phone} · ${ap.id}`
    );
  }

  let ok = 0;
  for (const ap of targets) {
    const restored = await request(`/api/admin/appointments/${ap.id}`, {
      method: "PATCH",
      cookie,
      body: { action: "restore" },
    });
    if (!restored.res.ok) {
      console.error(`FAIL restore ${ap.id}`, restored.json);
      process.exit(1);
    }
    ok += 1;
    console.log(`OK   restored ${ap.id}`);
  }

  console.log(`Done — restored ${ok} appointment(s). Overlaps left in place for Melanie.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
