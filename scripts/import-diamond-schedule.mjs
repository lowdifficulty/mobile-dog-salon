/**
 * Push Diamond's June/July schedule to production via groomer API.
 * Usage: node scripts/import-diamond-schedule.mjs
 *        SMOKE_BASE_URL=https://mobiledog-salon.com node scripts/import-diamond-schedule.mjs
 */

const BASE = process.env.SMOKE_BASE_URL || "https://mobiledog-salon.com";
const DIAMOND_PASSWORD = process.env.SCHEDULING_PASSWORD_DIAMOND || "Diamond2026!!";

const SLOT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const BOOKING_HOURS = 2;

function hourToSlot(h) {
  return `${String(h).padStart(2, "0")}:00`;
}

function slotsBetween(startHour, endHour) {
  const out = [];
  for (const h of SLOT_HOURS) {
    if (h >= startHour && h + BOOKING_HOURS <= endHour) {
      out.push(hourToSlot(h));
    }
  }
  return out;
}

/** Default full day: all hourly blocks 8 AM – 8 PM (matches groomer “Start with 8 AM – 8 PM”). */
function defaultFullDaySlots() {
  return SLOT_HOURS.map((h) => hourToSlot(h));
}

function parseWindow(text) {
  const t = (text ?? "").trim();
  if (!t) return defaultFullDaySlots();

  const lower = t.toLowerCase();
  if (lower.includes("from 1")) return slotsBetween(13, 20);

  const range = lower.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/
  );
  if (range) {
    let startH = parseInt(range[1], 10);
    const startM = parseInt(range[2] ?? "0", 10);
    let endH = parseInt(range[4], 10);
    const endM = parseInt(range[5] ?? "0", 10);
    const startMer = range[3];
    const endMer = range[6];

    if (startMer === "pm" && startH < 12) startH += 12;
    if (endMer === "pm" && endH < 12) endH += 12;
    if (!startMer && startH < 8) startH += 12;
    if (!endMer && endH <= 12 && endH < startH) endH += 12;

    if (startM >= 30) startH += 1;
    let endExclusive = endH;
    if (endM > 0) endExclusive = endH + 1;

    return slotsBetween(startH, endExclusive);
  }

  return defaultFullDaySlots();
}

function excelSerialToISO(serial) {
  const ms = (serial - 25569) * 86400 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

const ROWS = [
  { serial: 46193, status: "Off", window: "" },
  { serial: 46194, status: "Off", window: "" },
  { serial: 46195, status: "Off", window: "" },
  { serial: 46196, status: "Fully booked", window: "" },
  { serial: 46197, status: "Off", window: "" },
  { serial: 46198, status: "Available", window: "1:00–4:30 PM" },
  { serial: 46199, status: "Available", window: "8:00 AM–4:00 PM" },
  { serial: 46200, status: "Fully booked", window: "" },
  { serial: 46201, status: "Off", window: "" },
  { serial: 46202, status: "Available", window: "10:00 AM–1:00 PM" },
  { serial: 46203, status: "Available", window: "From 1:00 PM" },
  { serial: 46204, status: "Available", window: "8:00 AM–4:00 PM" },
  { serial: 46205, status: "Available", window: "8:00 AM–4:00 PM" },
  { serial: 46206, status: "Available", window: "8:00 AM–4:00 PM" },
  { serial: 46207, status: "Off", window: "" },
  { serial: 46208, status: "Off", window: "" },
  { serial: 46209, status: "Available", window: "11:00 AM–4:00 PM" },
  { serial: 46210, status: "Available", window: "8:00 AM–4:00 PM" },
  { serial: 46211, status: "Available", window: "8:00 AM–4:00 PM" },
  { serial: 46212, status: "Vacation", window: "" },
  { serial: 46213, status: "Vacation", window: "" },
  { serial: 46214, status: "Vacation", window: "" },
  { serial: 46215, status: "Vacation", window: "" },
  { serial: 46216, status: "Vacation", window: "" },
  { serial: 46217, status: "Available", window: "1:00–4:00 PM" },
  { serial: 46218, status: "Available", window: "11:00 AM–4:00 PM" },
  { serial: 46219, status: "Available", window: "" },
  { serial: 46220, status: "Available", window: "" },
  { serial: 46221, status: "Available", window: "" },
  { serial: 46222, status: "Off", window: "" },
  { serial: 46223, status: "Available", window: "" },
  { serial: 46224, status: "Available", window: "" },
  { serial: 46225, status: "Available", window: "" },
  { serial: 46226, status: "Available", window: "" },
  { serial: 46227, status: "Off", window: "" },
  { serial: 46228, status: "Off", window: "" },
  { serial: 46229, status: "Off", window: "" },
  { serial: 46230, status: "Available", window: "" },
  { serial: 46231, status: "Available", window: "" },
  { serial: 46232, status: "Available", window: "" },
  { serial: 46233, status: "Available", window: "" },
  { serial: 46234, status: "Available", window: "" },
];

function buildDiamondAvailability() {
  const availability = [];
  for (const row of ROWS) {
    if (row.status !== "Available") continue;
    const date = excelSerialToISO(row.serial);
    const times = parseWindow(row.window);
    if (times.length === 0) continue;
    availability.push({ groomerId: "diamond", date, times });
  }
  return availability;
}

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

async function main() {
  const availability = buildDiamondAvailability();
  console.log(`Importing ${availability.length} days for Diamond → ${BASE}`);

  const login = await request("/api/auth/login", {
    method: "POST",
    body: { role: "groomer", username: "diamond", password: DIAMOND_PASSWORD },
  });

  if (!login.res.ok) {
    console.error("Diamond login failed", login.json);
    process.exit(1);
  }

  const cookie = mergeCookies("", login.cookies);

  const save = await request("/api/groomer/availability", {
    method: "PUT",
    cookie,
    body: { availability },
  });

  if (!save.res.ok) {
    console.error("Save failed", save.json);
    process.exit(1);
  }

  console.log("Saved:", save.json);
  console.log("Persistence:", save.json?.persistence?.mode);

  const verify = await request("/api/groomer/availability", { cookie });
  const days = verify.json?.availability?.length ?? 0;
  console.log(`Verified: ${days} days on Diamond's calendar`);

  const sample = availability.find((a) => a.date === "2026-07-15");
  if (sample) {
    const pub = await request(
      `/api/availability?date=2026-07-15&service=signature`
    );
    const diamondSlots = (pub.json?.slots ?? []).filter(
      (s) => s.groomerId === "diamond"
    );
    console.log(`2026-07-15 booking slots for Diamond: ${diamondSlots.length}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
