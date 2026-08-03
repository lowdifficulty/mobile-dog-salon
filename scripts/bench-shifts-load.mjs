/**
 * Benchmark Shifts tab API load pattern.
 * Usage: node scripts/bench-shifts-load.mjs
 */
import { performance } from "node:perf_hooks";

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const ADMIN_USER = process.env.SCHEDULING_ADMIN_USER || "1";
const ADMIN_PASSWORD = process.env.SCHEDULING_PASSWORD || "1";
const MELANIE_PASSWORD = process.env.SCHEDULING_PASSWORD_MELANIE || "Licky2026!!";

async function request(path, { method = "GET", body, cookie } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = cookie;
  const start = performance.now();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const ms = performance.now() - start;
  return { res, text, ms, bytes: Buffer.byteLength(text, "utf8") };
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

async function login(role, username, password) {
  const { res, text } = await request("/api/auth/login", {
    method: "POST",
    body: { role, username, password },
  });
  const cookies = res.headers.getSetCookie?.() ?? [];
  const legacy = res.headers.get("set-cookie");
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${text}`);
  return mergeCookies("", [...cookies, legacy].filter(Boolean));
}

function fmtKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function timeParallel(label, paths, cookie) {
  const start = performance.now();
  const results = await Promise.all(paths.map((p) => request(p, { cookie })));
  const wall = performance.now() - start;
  console.log(`\n${label} (${paths.length} parallel requests, wall ${wall.toFixed(0)}ms)`);
  for (let i = 0; i < paths.length; i++) {
    const { res, ms, bytes } = results[i];
    console.log(
      `  ${res.status} ${ms.toFixed(0)}ms ${fmtKb(bytes)} — ${paths[i].slice(0, 80)}`
    );
  }
  const totalBytes = results.reduce((s, r) => s + r.bytes, 0);
  const maxReq = Math.max(...results.map((r) => r.ms));
  console.log(`  Total payload: ${fmtKb(totalBytes)}, slowest request: ${maxReq.toFixed(0)}ms`);
  return { wall, results, totalBytes, maxReq };
}

async function main() {
  console.log(`Benchmarking Shifts load against ${BASE}\n`);

  let cookie;
  try {
    const loginStart = performance.now();
    cookie = await login("admin", ADMIN_USER, ADMIN_PASSWORD);
    console.log(`Admin login: ${(performance.now() - loginStart).toFixed(0)}ms`);
  } catch (e) {
    console.error("Could not login:", e.message);
    process.exit(1);
  }

  const groomerId = "melanie";

  // Admin Shifts tab pattern (StaffShiftsPanel)
  const adminPaths = [
    "/api/staff/van-capacity",
    `/api/admin/availability?groomerId=${groomerId}&edit=1&van=nissan`,
    `/api/admin/availability?groomerId=${groomerId}&edit=1&van=dodge`,
    `/api/staff/van-capacity?van=nissan&groomerId=${groomerId}`,
    `/api/staff/van-capacity?van=dodge&groomerId=${groomerId}`,
  ];

  const admin = await timeParallel("Admin Shifts tab (all 5 requests)", adminPaths, cookie);

  // Groomer Shifts tab pattern
  const groomerCookie = await login("groomer", "melanie", MELANIE_PASSWORD);
  const groomerPaths = [
    "/api/groomer/availability?van=nissan",
    "/api/groomer/availability?van=dodge",
    `/api/staff/van-capacity?van=nissan&groomerId=${groomerId}`,
    `/api/staff/van-capacity?van=dodge&groomerId=${groomerId}`,
  ];
  const groomer = await timeParallel("Groomer Shifts tab (4 requests)", groomerPaths, groomerCookie);

  // Cold vs warm (second hit)
  console.log("\nWarm cache (repeat admin availability nissan):");
  const warm1 = await request(adminPaths[1], { cookie });
  const warm2 = await request(adminPaths[1], { cookie });
  console.log(`  1st repeat: ${warm1.ms.toFixed(0)}ms ${fmtKb(warm1.bytes)}`);
  console.log(`  2nd repeat: ${warm2.ms.toFixed(0)}ms ${fmtKb(warm2.bytes)}`);

  // Payload breakdown for availability
  const avail = JSON.parse(admin.results[1].text);
  console.log("\nAvailability response shape (nissan):");
  console.log(`  availability days: ${avail.availability?.length ?? 0}`);
  console.log(`  openSlotKeys: ${avail.openSlotKeys?.length ?? 0}`);
  console.log(`  slotOccupancy: ${avail.slotOccupancy?.length ?? 0}`);

  const vanCap = JSON.parse(admin.results[3].text);
  console.log("\nVan-capacity response shape (nissan):");
  console.log(`  availableTimeslots: ${vanCap.availableTimeslots?.length ?? 0}`);
  console.log(`  has analytics: ${Boolean(vanCap.analytics)}`);

  console.log("\n--- Summary ---");
  console.log(`Admin tab wall time: ${admin.wall.toFixed(0)}ms, ${fmtKb(admin.totalBytes)} total`);
  console.log(`Groomer tab wall time: ${groomer.wall.toFixed(0)}ms, ${fmtKb(groomer.totalBytes)} total`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
