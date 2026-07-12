/**
 * Remove Diamond van conflicts and groomer availability overlaps.
 * Keeps Melanie's appointments and overlapping shifts.
 *
 * Usage: node scripts/clear-diamond-conflicts.mjs
 *        SMOKE_BASE_URL=http://localhost:3000 node scripts/clear-diamond-conflicts.mjs
 */

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const ADMIN_USER = "1";
const ADMIN_PASSWORD = "1";

const DIAMOND_APPOINTMENTS_TO_DELETE = [
  "027aa086-b409-4228-b80e-f81a5084bddd",
  "795250a7-f308-419b-9583-cea738f24b65",
];

/** Shift blocks to remove from Diamond (Melanie keeps these). */
const DIAMOND_BLOCKS_TO_REMOVE = [
  { date: "2026-07-18", time: "08:00" },
  { date: "2026-07-18", time: "11:00" },
  { date: "2026-07-22", time: "14:00" },
  { date: "2026-07-23", time: "11:00" },
  { date: "2026-07-23", time: "14:00" },
  { date: "2026-07-30", time: "11:00" },
  { date: "2026-07-30", time: "14:00" },
];

const BLOCK_HOURS = {
  "08:00": ["08:00", "09:00", "10:00"],
  "11:00": ["11:00", "12:00", "13:00"],
  "14:00": ["14:00", "15:00", "16:00"],
  "17:00": ["17:00", "18:00", "19:00"],
};

async function request(path, { method = "GET", body, cookie } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // plain text
  }
  const setCookie = res.headers.getSetCookie?.() ?? [];
  return { res, json, text, cookies: setCookie };
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

function removeBlock(times, blockStart) {
  const remove = new Set(BLOCK_HOURS[blockStart] ?? []);
  return times.filter((t) => !remove.has(t)).sort();
}

function applyDiamondBlockRemovals(availability) {
  const byDate = new Map(availability.map((day) => [day.date, [...day.times]]));

  for (const { date, time } of DIAMOND_BLOCKS_TO_REMOVE) {
    const times = byDate.get(date);
    if (!times) continue;
    const next = removeBlock(times, time);
    if (next.length === 0) byDate.delete(date);
    else byDate.set(date, next);
  }

  return [...byDate.entries()].map(([date, times]) => ({
    groomerId: "diamond",
    date,
    times,
  }));
}

async function main() {
  console.log(`Clearing Diamond conflicts @ ${BASE}`);

  const login = await request("/api/auth/login", {
    method: "POST",
    body: { role: "admin", username: ADMIN_USER, password: ADMIN_PASSWORD },
  });
  if (!login.res.ok) {
    console.error("Admin login failed", login.json ?? login.text);
    process.exit(1);
  }
  let cookie = mergeCookies("", login.cookies);
  console.log("OK   admin login");

  for (const id of DIAMOND_APPOINTMENTS_TO_DELETE) {
    const del = await request(`/api/admin/appointments/${id}`, {
      method: "DELETE",
      cookie,
    });
    if (del.res.status === 404) {
      console.log(`SKIP appointment ${id} (already removed)`);
      continue;
    }
    if (!del.res.ok) {
      console.error(`FAIL delete appointment ${id}`, del.json ?? del.text);
      process.exit(1);
    }
    console.log(`OK   deleted appointment ${id}`);
  }

  const avGet = await request("/api/staff/availability?groomerId=diamond&edit=1", {
    cookie,
  });
  if (!avGet.res.ok) {
    console.error("FAIL load diamond availability", avGet.json ?? avGet.text);
    process.exit(1);
  }

  const updated = applyDiamondBlockRemovals(avGet.json.availability ?? []);
  const put = await request("/api/staff/availability", {
    method: "PUT",
    cookie,
    body: { groomerId: "diamond", availability: updated },
  });
  if (!put.res.ok) {
    console.error("FAIL save diamond availability", put.json ?? put.text);
    process.exit(1);
  }
  console.log(`OK   updated diamond availability (${updated.length} day rows)`);

  const reconcile = await request("/api/staff/van-capacity", {
    method: "POST",
    cookie,
    body: { action: "reconcile" },
  });
  if (!reconcile.res.ok) {
    console.error("FAIL reconcile", reconcile.json ?? reconcile.text);
    process.exit(1);
  }
  const summary = reconcile.json;
  console.log(
    `OK   reconcile — conflicts: ${summary.conflictCount}, overlaps: ${summary.groomerAvailabilityOverlapCount}`
  );

  if (summary.conflictCount > 0 || summary.groomerAvailabilityOverlapCount > 0) {
    console.error("Still have conflicts or overlaps — review manually.");
    process.exit(1);
  }

  console.log("Done — conflicts and overlaps cleared.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
