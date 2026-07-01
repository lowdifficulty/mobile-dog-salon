/**
 * End-to-end booking flow test (mirrors BookingFlowForm API calls).
 * Usage: node scripts/test-booking-flow.mjs
 *        BASE_URL=https://mobiledog-salon.com node scripts/test-booking-flow.mjs
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";

function mergeCookies(existing, setCookieHeaders) {
  const jar = new Map();
  for (const part of (existing || "").split(";")) {
    const [k, v] = part.trim().split("=");
    if (k && v) jar.set(k, v);
  }
  for (const c of setCookieHeaders) {
    if (!c) continue;
    const first = c.split(";")[0];
    const eq = first.indexOf("=");
    if (eq === -1) continue;
    jar.set(first.slice(0, eq).trim(), first.slice(eq + 1));
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function request(path, { method = "GET", body, cookie } = {}) {
  const headers = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
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
  const legacy = res.headers.get("set-cookie");
  const cookies = [...setCookie, legacy].filter(Boolean);

  return { status: res.status, json, text, cookies };
}

async function findSlot() {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Los_Angeles",
  });
  const res = await request(
    `/api/availability?from=${today}&days=60&service=full-groom`
  );
  if (res.status !== 200) {
    throw new Error(`Availability failed (${res.status}): ${res.text}`);
  }

  for (const day of res.json?.days ?? []) {
    if (day.isPast || !day.slots?.length) continue;
    for (const slot of day.slots) {
      return slot;
    }
  }
  throw new Error("No bookable slots in the next 60 days");
}

async function main() {
  console.log(`Booking flow test @ ${BASE}`);

  const slot = await findSlot();
  console.log(`Slot: ${slot.slotKey} (${slot.displayTime})`);

  let cookie = "";

  const hold = await request("/api/book/hold", {
    method: "POST",
    cookie,
    body: { slotKey: slot.slotKey },
  });
  cookie = mergeCookies(cookie, hold.cookies);

  if (hold.status !== 200) {
    console.error("FAIL hold", hold.status, hold.json ?? hold.text);
    process.exit(1);
  }
  console.log("OK   hold slot");

  const book = await request("/api/book", {
    method: "POST",
    cookie,
    body: {
      slotKey: slot.slotKey,
      fromFallback: Boolean(hold.json?.holds?.backend === "none"),
      petName: "",
      petBreed: "",
      petSize: "medium",
      service: "full-groom",
      firstName: "Booking",
      lastName: "Test",
      phone: "9495550100",
      smsOptIn: true,
      address: "123 Test Lane",
      city: "Irvine",
      zipCode: "92618",
      notes: "Automated booking flow test — safe to cancel",
    },
  });
  cookie = mergeCookies(cookie, book.cookies);

  if (book.status !== 200 || !book.json?.success) {
    console.error("FAIL book", book.status, book.json ?? book.text);
    process.exit(1);
  }

  console.log("OK   book appointment", book.json.appointmentId);
  console.log("\nBooking flow passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
