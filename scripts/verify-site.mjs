/**
 * Smoke test — run while server is up, or pass --start to build+serve first.
 * Usage: npm run smoke
 *        npm run smoke -- --start
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const ROUTES = [
  "/",
  "/about",
  "/about/our-groomers",
  "/about/our-vans",
  "/careers",
  "/locations",
  "/pet-grooming-services",
  "/pet-grooming-services/mobile-spa-salon-haircuts",
  "/pet-grooming-services/pet-bathing-washing",
  "/pet-grooming-services/pet-nail-trimming-clipping-cutting",
  "/pet-grooming-services/deshedding-dematting",
  "/how-it-works",
  "/why-mobile-dog-salon",
  "/reviews",
  "/blog",
  "/blog/mobile-dog-grooming-near-me-how-to-choose-a-groomer-that-comes-to-you",
  "/contact",
  "/book",
  "/privacy-policy",
  "/groomer/login",
];

const CONTENT_CHECKS = [
  { route: "/", patterns: ["Good Dogs", "Mobile Dog Salon"] },
  { route: "/blog/mobile-dog-grooming-near-me-how-to-choose-a-groomer-that-comes-to-you", patterns: ["Hattie Pup"] },
];

async function waitForServer(url, maxMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function checkRoutes() {
  const failed = [];

  for (const route of ROUTES) {
    const url = `${BASE}${route}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        failed.push(`${route} (${res.status})`);
        console.error(`FAIL ${route} -> ${res.status}`);
      } else {
        console.log(`OK   ${route}`);
      }
    } catch (err) {
      failed.push(route);
      console.error(`FAIL ${route} -> ${err.message}`);
    }
  }

  for (const { route, patterns } of CONTENT_CHECKS) {
    try {
      const html = await fetch(`${BASE}${route}`).then((r) => r.text());
      for (const p of patterns) {
        if (!html.includes(p)) {
          failed.push(`${route} missing "${p}"`);
          console.error(`FAIL ${route} missing content: ${p}`);
        }
      }
    } catch (err) {
      failed.push(`${route} content check`);
      console.error(`FAIL ${route} content -> ${err.message}`);
    }
  }

  try {
    const availRes = await fetch(
      `${BASE}/api/availability?date=2026-06-15&service=signature`
    );
    if (!availRes.ok) {
      failed.push(`/api/availability (${availRes.status})`);
      console.error(`FAIL /api/availability -> ${availRes.status}`);
    } else {
      console.log("OK   /api/availability");
    }
  } catch (err) {
    failed.push("/api/availability");
    console.error(`FAIL /api/availability -> ${err.message}`);
  }

  try {
    const res = await fetch(`${BASE}/api/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.status !== 400) {
      failed.push(`/api/book (${res.status})`);
      console.error(`FAIL /api/book -> expected 400 for empty body, got ${res.status}`);
    } else {
      console.log("OK   /api/book");
    }
  } catch (err) {
    failed.push("/api/book");
    console.error(`FAIL /api/book -> ${err.message}`);
  }

  return failed;
}

function startServer() {
  const isWin = process.platform === "win32";
  const cmd = isWin ? "npm.cmd" : "npm";
  return spawn(cmd, ["start"], {
    stdio: "inherit",
    shell: isWin,
    env: { ...process.env, PORT: "3000" },
  });
}

async function main() {
  const shouldStart = process.argv.includes("--start");
  let child = null;

  if (shouldStart) {
    if (!existsSync(join(process.cwd(), ".next"))) {
      console.error("No .next folder — run npm run build first.");
      process.exit(1);
    }
    console.log("Starting production server...");
    child = startServer();
    const ready = await waitForServer(BASE);
    if (!ready) {
      console.error("Server did not become ready on " + BASE);
      child.kill();
      process.exit(1);
    }
  } else {
    const ready = await waitForServer(BASE, 5000);
    if (!ready) {
      console.error(
        `No server at ${BASE}. Run npm start first, or: npm run smoke -- --start`
      );
      process.exit(1);
    }
  }

  console.log(`\nSmoke testing ${BASE} (${ROUTES.length} routes)...\n`);
  const failed = await checkRoutes();

  if (child) child.kill();

  console.log("");
  if (failed.length === 0) {
    console.log(`SITE CHECK: ALL ${ROUTES.length} ROUTES PASS`);
    process.exit(0);
  } else {
    console.error(`SITE CHECK: ${failed.length} issue(s)`);
    process.exit(1);
  }
}

main();
