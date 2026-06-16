/**
 * Clean local production server on http://localhost:3000
 * Usage: npm run local
 */

import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";

const PORT = "3000";
const isWin = process.platform === "win32";

function killPort(port) {
  try {
    if (isWin) {
      execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
        { stdio: "ignore" }
      );
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
        shell: true,
        stdio: "ignore",
      });
    }
  } catch {
    // port was free
  }
}

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: isWin,
      env: { ...process.env, ...env },
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function main() {
  console.log(`Stopping anything on port ${PORT}...`);
  killPort(PORT);

  if (existsSync(".next")) {
    console.log("Removing stale .next cache...");
    rmSync(".next", { recursive: true, force: true });
  }

  const npm = isWin ? "npm.cmd" : "npm";
  console.log("Building...");
  await run(npm, ["run", "build"]);

  console.log(`Starting http://localhost:${PORT} ...`);
  const child = spawn(npm, ["start"], {
    stdio: "inherit",
    shell: isWin,
    env: { ...process.env, PORT },
  });

  child.on("close", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
