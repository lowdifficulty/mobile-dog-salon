/**
 * Enable Square sandbox payments (local .env.local + Vercel).
 *
 * Usage:
 *   node scripts/connect-square-sandbox.mjs
 *   node scripts/connect-square-sandbox.mjs <access-token> <application-id>
 *
 * Get sandbox credentials: https://developer.squareup.com/apps → Credentials (Sandbox)
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const accessToken = process.argv[2]?.trim();
const applicationId = process.argv[3]?.trim();

if (!accessToken || !applicationId) {
  console.error(
    "Usage: node scripts/connect-square-sandbox.mjs <access-token> <application-id>"
  );
  console.error("Get sandbox credentials: https://developer.squareup.com/apps → Credentials");
  process.exit(1);
}

const envPath = resolve(process.cwd(), ".env.local");
let contents = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

const vars = {
  SQUARE_ACCESS_TOKEN: accessToken,
  SQUARE_APPLICATION_ID: applicationId,
  SQUARE_ENVIRONMENT: "sandbox",
  PAYMENT_PROVIDER: "square",
};

for (const [key, value] of Object.entries(vars)) {
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(contents)) {
    contents = contents.replace(pattern, `${key}=${value}`);
  } else {
    contents = contents.trimEnd() + `\n${key}=${value}\n`;
  }
}

writeFileSync(envPath, contents.endsWith("\n") ? contents : contents + "\n", "utf8");
console.log("Updated .env.local with Square sandbox credentials.");

process.env.SQUARE_ACCESS_TOKEN = accessToken;
process.env.SQUARE_APPLICATION_ID = applicationId;
process.env.SQUARE_ENVIRONMENT = "sandbox";

const test = spawnSync("node", ["scripts/test-square-connection.mjs"], {
  stdio: "inherit",
  env: process.env,
});
if (test.status !== 0) process.exit(test.status ?? 1);

const isWin = process.platform === "win32";

function run(cmd, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: isWin });
    child.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${cmd} exited with ${code}`));
    });
  });
}

for (const env of ["development", "preview", "production"]) {
  for (const [key, value] of Object.entries(vars)) {
    try {
      console.log(`Adding ${key} to Vercel (${env})…`);
      await run("npx", ["vercel", "env", "add", key, env, "--force", "--yes", "--value", value]);
    } catch (err) {
      console.warn(`Vercel ${env} ${key}:`, err.message);
    }
  }
}

console.log("\nSquare sandbox is connected.");
console.log("Restart localhost: npm run ensure-local");
console.log("Production picks up new env vars after redeploy (say 42 to deploy).");
