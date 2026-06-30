/** Quick hold API smoke test against localhost. */
const base = process.env.BASE_URL || "http://localhost:3000";
const slotKey = `melanie|2099-12-20|09:00`;

async function postHold(cookies = "") {
  const res = await fetch(`${base}/api/book/hold`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body: JSON.stringify({ slotKey }),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const text = await res.text();
  return { status: res.status, text, setCookie };
}

async function main() {
  console.log("GET status...");
  const statusRes = await fetch(`${base}/api/book/hold`);
  console.log(await statusRes.json());

  console.log("\nHold session A...");
  const a = await postHold();
  console.log(a.status, a.text);
  const cookie = a.setCookie.map((c) => c.split(";")[0]).join("; ");

  console.log("\nHold session B (should conflict)...");
  const b = await postHold();
  console.log(b.status, b.text);

  console.log("\nHold session A again (refresh)...");
  const a2 = await postHold(cookie);
  console.log(a2.status, a2.text);

  let failed = false;
  if (a.status !== 200) failed = true;
  if (b.status !== 409) failed = true;
  if (a2.status !== 200) failed = true;

  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
