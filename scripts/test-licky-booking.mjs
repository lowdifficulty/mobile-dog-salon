/**
 * Smoke test Licky guest booking via /api/client/chat (book_slot action).
 * Usage: BASE_URL=http://localhost:3000 node scripts/test-licky-booking.mjs
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

async function chat(body, cookie = "") {
  const res = await fetch(`${BASE}/api/client/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  const cookies = res.headers.getSetCookie?.() ?? [];
  return { status: res.status, json, cookies };
}

async function main() {
  console.log(`Licky booking test @ ${BASE}`);

  let cookie = "";

  const avail = await chat(
    { action: { type: "show_availability", payload: { days: 14, service: "full-groom" } } },
    cookie
  );
  cookie = mergeCookies(cookie, avail.cookies);
  const taken = new Set(["melanie|2026-07-02|08:00"]);
  const slotKey =
    avail.json?.buttons?.find((b) => b.payload?.slotKey && !taken.has(b.payload.slotKey))
      ?.payload?.slotKey ?? avail.json?.buttons?.[0]?.payload?.slotKey;
  if (!slotKey) {
    console.error("FAIL no slot buttons", avail.json?.reply?.slice(0, 120));
    process.exit(1);
  }
  console.log("OK   availability buttons", slotKey);

  const hold = await chat(
    {
      action: {
        type: "book_slot",
        payload: {
          slotKey,
          service: "full-groom",
          fromFallback: Boolean(avail.json?.buttons?.[0]?.payload?.fromFallback),
        },
      },
    },
    cookie
  );
  cookie = mergeCookies(cookie, hold.cookies);
  if (!hold.json?.reply?.includes("address")) {
    console.error("FAIL book_slot step 1", hold.json);
    process.exit(1);
  }
  console.log("OK   slot held, asking for address");

  const addr = await chat(
    {
      messages: [
        { role: "user", content: "123 Main St, Irvine, 92618" },
      ],
    },
    cookie
  );
  cookie = mergeCookies(cookie, addr.cookies);
  if (!addr.json?.reply?.toLowerCase().includes("name") && !addr.json?.reply?.toLowerCase().includes("set")) {
    console.error("FAIL address step", addr.json?.reply);
    process.exit(1);
  }
  console.log("OK   address accepted:", addr.json.reply.slice(0, 80));

  const contact = await chat(
    {
      messages: [
        { role: "user", content: "123 Main St, Irvine, 92618" },
        { role: "assistant", content: addr.json.reply },
        { role: "user", content: "Jane Doe 9495550199" },
      ],
    },
    cookie
  );
  cookie = mergeCookies(cookie, contact.cookies);

  if (
    !contact.json?.reply?.toLowerCase().includes("all set") &&
    !contact.json?.reply?.toLowerCase().includes("you're set")
  ) {
    console.error("FAIL booking confirm", contact.json);
    process.exit(1);
  }
  console.log("OK   booking reply:", contact.json.reply.slice(0, 100));
  console.log("\nLicky booking flow passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
