/**
 * Push Melanie's recurring weekly schedule (6 weeks) to production via groomer API.
 *
 * Weekly hours (Pacific):
 *   Monday    4:00 PM – 8:00 PM
 *   Tuesday   12:00 PM – 6:00 PM
 *   Wednesday off
 *   Thursday  all day (8 AM – 8 PM booking window)
 *   Friday    12:00 PM – 6:00 PM
 *   Saturday  all day
 *   Sunday    off
 *
 * Skips major US holidays in the 6-week window.
 *
 * Usage:
 *   node scripts/import-melanie-schedule.mjs
 *   SMOKE_BASE_URL=https://mobiledog-salon.com node scripts/import-melanie-schedule.mjs
 */

const BASE = process.env.SMOKE_BASE_URL || "https://mobiledog-salon.com";
const MELANIE_PASSWORD = process.env.SCHEDULING_PASSWORD_MELANIE || "Licky2026!!";
const WEEKS_OUT = Number(process.env.SCHEDULE_WEEKS || 6);
const BOOKING_HOURS = 2;

const SLOT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

function hourToSlot(h) {
  return `${String(h).padStart(2, "0")}:00`;
}

function slotsBetween(startHour, endExclusiveHour) {
  const out = [];
  for (const h of SLOT_HOURS) {
    if (h >= startHour && h + BOOKING_HOURS <= endExclusiveHour) {
      out.push(hourToSlot(h));
    }
  }
  return out;
}

function fullDaySlots() {
  return SLOT_HOURS.map((h) => hourToSlot(h));
}

/** Melanie's weekly template by JS weekday (0=Sun … 6=Sat). */
const MELANIE_WEEKLY = {
  0: null,
  1: slotsBetween(16, 20), // Mon 4–8 PM
  2: slotsBetween(12, 18), // Tue 12–6 PM
  3: null,
  4: fullDaySlots(), // Thu all day
  5: slotsBetween(12, 18), // Fri 12–6 PM
  6: fullDaySlots(), // Sat all day
};

function formatDateISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nthWeekdayOfMonth(year, monthIndex, weekday, n) {
  let count = 0;
  const d = new Date(year, monthIndex, 1);
  while (d.getMonth() === monthIndex) {
    if (d.getDay() === weekday) {
      count += 1;
      if (count === n) return formatDateISO(d);
    }
    d.setDate(d.getDate() + 1);
  }
  return null;
}

function lastWeekdayOfMonth(year, monthIndex, weekday) {
  const d = new Date(year, monthIndex + 1, 0);
  while (d.getMonth() === monthIndex) {
    if (d.getDay() === weekday) return formatDateISO(d);
    d.setDate(d.getDate() - 1);
  }
  return null;
}

function majorHolidaysInRange(startISO, endISO) {
  const start = new Date(`${startISO}T12:00:00`);
  const end = new Date(`${endISO}T12:00:00`);
  const years = new Set();
  for (let y = start.getFullYear(); y <= end.getFullYear(); y += 1) years.add(y);

  const dates = new Set();

  for (const year of years) {
    dates.add(`${year}-01-01`); // New Year's Day
    dates.add(`${year}-06-19`); // Juneteenth
    dates.add(`${year}-07-04`); // Independence Day
    dates.add(`${year}-12-24`); // Christmas Eve
    dates.add(`${year}-12-25`); // Christmas
    dates.add(`${year}-12-31`); // New Year's Eve

    const mlk = nthWeekdayOfMonth(year, 0, 1, 3);
    const presidents = nthWeekdayOfMonth(year, 1, 1, 3);
    const memorial = lastWeekdayOfMonth(year, 4, 1);
    const labor = nthWeekdayOfMonth(year, 8, 1, 1);
    const thanksgiving = nthWeekdayOfMonth(year, 10, 4, 4);

    [mlk, presidents, memorial, labor, thanksgiving].forEach((d) => {
      if (d) dates.add(d);
    });
  }

  return [...dates].filter((d) => d >= startISO && d <= endISO).sort();
}

function slotsCoveredByBooking(startTime, durationMinutes = 120) {
  const [h, m] = startTime.split(":").map(Number);
  let minutes = h * 60 + (m ?? 0);
  const end = minutes + durationMinutes;
  const covered = [];
  while (minutes < end) {
    const hh = Math.floor(minutes / 60);
    covered.push(`${String(hh).padStart(2, "0")}:00`);
    minutes += 60;
  }
  return covered;
}

function removeBookedSlots(times, startTime, durationMinutes = 120) {
  const remove = new Set(slotsCoveredByBooking(startTime, durationMinutes));
  return times.filter((t) => !remove.has(t));
}

function appointmentStartTimePacific(iso) {
  const d = new Date(iso);
  const hh = d.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    hour12: false,
  });
  const mm = d.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    minute: "2-digit",
  });
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`.replace("24:", "00:");
}

function appointmentDatePacific(iso) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function buildMelanieSchedule() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(today);
  end.setDate(end.getDate() + WEEKS_OUT * 7);

  const startISO = formatDateISO(today);
  const endISO = formatDateISO(end);
  const holidays = new Set(majorHolidaysInRange(startISO, endISO));

  const availability = [];
  const d = new Date(today);

  while (d <= end) {
    const date = formatDateISO(d);
    const weekday = d.getDay();
    const template = MELANIE_WEEKLY[weekday];

    if (template && template.length > 0 && !holidays.has(date)) {
      availability.push({
        groomerId: "melanie",
        date,
        times: [...template],
      });
    }

    d.setDate(d.getDate() + 1);
  }

  return { availability, holidays: [...holidays], startISO, endISO };
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

function applyExistingBookings(availability, appointments) {
  const byDate = new Map(availability.map((day) => [day.date, { ...day, times: [...day.times] }]));

  for (const ap of appointments) {
    if (ap.status === "cancelled") continue;
    const date = appointmentDatePacific(ap.startAt);
    const day = byDate.get(date);
    if (!day) continue;
    const startTime = appointmentStartTimePacific(ap.startAt);
    day.times = removeBookedSlots(day.times, startTime, ap.durationMinutes ?? 120);
    if (day.times.length === 0) byDate.delete(date);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

async function main() {
  const { availability, holidays, startISO, endISO } = buildMelanieSchedule();
  console.log(`Melanie schedule → ${BASE}`);
  console.log(`Range: ${startISO} to ${endISO} (${WEEKS_OUT} weeks)`);
  console.log(`Generated ${availability.length} working days`);
  if (holidays.length) {
    console.log(`Skipping holidays: ${holidays.join(", ")}`);
  }

  const login = await request("/api/auth/login", {
    method: "POST",
    body: { role: "groomer", username: "melanie", password: MELANIE_PASSWORD },
  });

  if (!login.res.ok) {
    console.error("Melanie login failed", login.json);
    process.exit(1);
  }

  const cookie = mergeCookies("", login.cookies);

  const apptRes = await request("/api/groomer/appointments?filter=upcoming", { cookie });
  const appointments = apptRes.json?.appointments ?? [];
  const finalAvailability = applyExistingBookings(availability, appointments);

  if (appointments.length) {
    console.log(`Adjusted for ${appointments.length} upcoming booking(s)`);
  }

  const save = await request("/api/groomer/availability", {
    method: "PUT",
    cookie,
    body: { availability: finalAvailability },
  });

  if (!save.res.ok) {
    console.error("Save failed", save.json);
    process.exit(1);
  }

  console.log("Saved:", save.json?.count, "days");
  console.log("Persistence:", save.json?.persistence?.mode);

  const sample = finalAvailability.find((d) => d.date >= startISO);
  if (sample) {
    console.log(`Sample ${sample.date}: ${sample.times.join(", ")}`);
  }

  const pub = await request(
    `/api/availability?week=${startISO}&service=full-groom`
  );
  const melanieDays = (pub.json?.days ?? []).filter((d) =>
    d.slots.some((s) => s.groomerId === "melanie")
  );
  console.log(`Public calendar: Melanie open on ${melanieDays.length} day(s) in first week`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
