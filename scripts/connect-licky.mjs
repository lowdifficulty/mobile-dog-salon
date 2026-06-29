/**
 * Add OpenAI API key for Licky (local .env.local + Vercel).
 *
 * Usage:
 *   node scripts/connect-licky.mjs sk-your-openai-key
 *
 * Get a key: https://platform.openai.com/api-keys
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const apiKey = process.argv[2]?.trim();
if (!apiKey || !apiKey.startsWith("sk-")) {
  console.error("Usage: node scripts/connect-licky.mjs sk-your-openai-key");
  process.exit(1);
}

const envPath = resolve(process.cwd(), ".env.local");
let contents = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

if (/^OPENAI_API_KEY=/m.test(contents)) {
  contents = contents.replace(/^OPENAI_API_KEY=.*$/m, `OPENAI_API_KEY=${apiKey}`);
} else {
  contents = contents.trimEnd() + `\n\n# Licky AI chat\nOPENAI_API_KEY=${apiKey}\n`;
}

writeFileSync(envPath, contents.endsWith("\n") ? contents : contents + "\n", "utf8");
console.log("Updated .env.local with OPENAI_API_KEY");

const isWin = process.platform === "win32";

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: isWin,
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with ${code}`));
    });
  });
}

for (const env of ["development", "preview", "production"]) {
  try {
    console.log(`Adding OPENAI_API_KEY to Vercel (${env})…`);
    await run("npx", [
      "vercel",
      "env",
      "add",
      "OPENAI_API_KEY",
      env,
      "--force",
      "--yes",
      "--value",
      apiKey,
    ]);
  } catch (err) {
    console.warn(`Vercel ${env}:`, err.message);
    console.warn("Add manually: Vercel dashboard → Settings → Environment Variables");
  }
}

process.env.OPENAI_API_KEY = apiKey;
const { spawnSync } = await import("node:child_process");
const test = spawnSync("node", ["scripts/test-licky-connection.mjs"], {
  stdio: "inherit",
  env: { ...process.env, OPENAI_API_KEY: apiKey },
});
if (test.status !== 0) process.exit(test.status ?? 1);

console.log("\nLicky is connected! Restart localhost (npm run 67) to pick up the new key.");
