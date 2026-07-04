/**
 * End-to-end scheduling persistence test.
 * Usage: node scripts/verify-scheduling.mjs
 *        SMOKE_BASE_URL=http://localhost:3000 node scripts/verify-scheduling.mjs
 */

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const MELANIE_EMAIL = "melanie@mobiledog-salon.com";
const MELANIE_PASSWORD = process.env.SCHEDULING_PASSWORD_MELANIE || "Licky2026!!";
const TEST_DATE = process.env.SCHEDULING_TEST_DATE || "2026-07-15";
const TEST_TIMES = ["09:00", "10:00", "11:00"];

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

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
  const legacyCookie = res.headers.get("set-cookie");
  const cookies = [...setCookie, legacyCookie].filter(Boolean);
  return { res, json, text, cookies };
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
  const failures = [];
  const testDate = TEST_DATE || todayPlus(14);

  console.log(`Scheduling QA @ ${BASE}`);
  console.log(`Test date: ${testDate}`);

  const login = await request("/api/auth/login", {
    method: "POST",
    body: {
      role: "groomer",
      username: "melanie",
      password: MELANIE_PASSWORD,
    },
  });

  if (!login.res.ok) {
    failures.push(`groomer login (${login.res.status})`);
    console.error("FAIL groomer login", login.json ?? login.text);
    process.exit(1);
  }

  let cookie = mergeCookies("", login.cookies);
  console.log("OK   groomer login");

  const save = await request("/api/groomer/availability", {
    method: "PUT",
    cookie,
    body: {
      availability: [
        {
          groomerId: "melanie",
          date: testDate,
          times: TEST_TIMES,
        },
      ],
    },
  });

  if (!save.res.ok) {
    failures.push(`save availability (${save.res.status})`);
    console.error("FAIL save", save.json ?? save.text);
  } else {
    console.log("OK   save availability", save.json?.persistence?.mode ?? "");
  }

  const groomerGet = await request("/api/groomer/availability", { cookie });
  const days = groomerGet.json?.availability ?? [];
  const day = days.find((d) => d.date === testDate);
  if (!day || day.times.length !== TEST_TIMES.length) {
    failures.push("groomer reload after save");
    console.error("FAIL groomer reload", days);
  } else {
    console.log("OK   groomer reload matches save");
  }

  const publicSlots = await request(
    `/api/availability?date=${testDate}&service=signature`
  );
  const melanieSlots = (publicSlots.json?.slots ?? []).filter(
    (s) => s.groomerId === "melanie"
  );
  if (melanieSlots.length > 0) {
    failures.push("melanie should not appear on public booking calendar");
    console.error("FAIL Melanie still has public slots", melanieSlots);
  } else {
    console.log("OK   Melanie excluded from public booking calendar");
  }

  const relogin = await request("/api/auth/login", {
    method: "POST",
    body: {
      role: "groomer",
      username: "melanie",
      password: MELANIE_PASSWORD,
    },
  });
  cookie = mergeCookies(cookie, relogin.cookies);
  const afterRelogin = await request("/api/groomer/availability", { cookie });
  const day2 = (afterRelogin.json?.availability ?? []).find(
    (d) => d.date === testDate
  );
  if (!day2 || day2.times.length !== TEST_TIMES.length) {
    failures.push("persist after re-login");
    console.error("FAIL after re-login", afterRelogin.json);
  } else {
    console.log("OK   persists after re-login");
  }

  if (failures.length) {
    console.error("\nScheduling QA FAILED:", failures.join(", "));
    process.exit(1);
  }

  console.log("\nScheduling QA passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
