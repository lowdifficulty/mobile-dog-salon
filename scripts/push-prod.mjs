/**
 * Push current branch to GitHub and deploy to Vercel production.
 * Usage: npm run 42 | 42 (after scripts/install-42.ps1)
 */

import { spawn } from "node:child_process";

const isWin = process.platform === "win32";

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: isWin,
      ...options,
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with ${code}`));
    });
  });
}

async function main() {
  const { execSync } = await import("node:child_process");
  const dirty = execSync("git status --porcelain --untracked-files=no", { encoding: "utf8" }).trim();
  if (dirty) {
    console.error(
      "Uncommitted changes detected. Commit first, then run 42 again."
    );
    process.exit(1);
  }

  console.log("Pushing to GitHub...");
  await run("git", ["push"]);

  console.log("Deploying to Vercel production...");
  await run("npx", ["vercel", "deploy", "--prod"]);

  console.log("Done — GitHub and Vercel production are updated.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
