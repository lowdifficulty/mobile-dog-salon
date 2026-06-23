/**
 * Clean local production server on http://localhost:3000
 * Usage: npm run local | npm run 67 | 67 (after scripts/install-67.ps1)
 */

import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";

const PORT = "3000";
const isWin = process.platform === "win32";
const localUrl = `http://localhost:${PORT}`;

function openBrowser(url) {
  if (isWin) {
    spawn("cmd", ["/c", "start", "", url], { shell: false, stdio: "ignore" });
  } else {
    spawn("open", [url], { shell: true, stdio: "ignore" });
  }
}

async function waitForServer(port, maxAttempts = 120) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`http://localhost:${port}`);
      if (res.ok || res.status < 500) return true;
    } catch {
      // server still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

function killPort(port) {
  try {
    if (isWin) {
      const out = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf8",
        shell: true,
      });
      const pids = new Set();
      for (const line of out.split("\n")) {
        if (!line.includes("LISTENING")) continue;
        const parts = line.trim().split(/\s+/);
        const pid = Number.parseInt(parts[parts.length - 1], 10);
        if (pid > 0) pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore", shell: true });
        } catch {
          // process already exited
        }
      }
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
  console.log("Building... (about 1-2 minutes, then browser opens automatically)");
  await run(npm, ["run", "build"]);

  console.log(`Starting ${localUrl} ...`);
  const child = spawn(npm, ["start"], {
    stdio: "inherit",
    shell: isWin,
    env: { ...process.env, PORT },
  });

  void (async () => {
    const ready = await waitForServer(PORT);
    if (ready) {
      console.log(`Opening ${localUrl} in your browser...`);
      console.log("If groomer tabs look outdated, hard-refresh (Ctrl+Shift+R) or clear site data for localhost.");
      openBrowser(localUrl);
    } else {
      console.log(`Server did not respond. Open ${localUrl} manually if it is running.`);
    }
  })();

  child.on("close", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
