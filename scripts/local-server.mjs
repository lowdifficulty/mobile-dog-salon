/**
 * Start Next.js production server in a detached process that survives on Windows.
 */

import { spawn, execSync } from "node:child_process";
import { existsSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const isWin = process.platform === "win32";

/** Strip Vercel flags from .env.local so local file stores are used for QA snapshots. */
export function localProcessEnv(port = 3000) {
  const env = { ...process.env, PORT: String(port), LOCALHOST_PROD_DATA: "1" };
  for (const key of Object.keys(env)) {
    if (key === "VERCEL" || key.startsWith("VERCEL_")) {
      delete env[key];
    }
  }
  return env;
}

export function getNextBin() {
  return join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
}

export function killPort(port) {
  const pids = new Set();

  // Prefer the pid we recorded when we started the local server.
  try {
    const pidPath = join(process.cwd(), ".local-server.pid");
    if (existsSync(pidPath)) {
      const recorded = Number.parseInt(readFileSync(pidPath, "utf8").trim(), 10);
      if (recorded > 0) pids.add(recorded);
    }
  } catch {
    // ignore
  }

  try {
    if (isWin) {
      const out = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf8",
        shell: true,
      });
      for (const line of out.split("\n")) {
        if (!line.includes("LISTENING")) continue;
        const parts = line.trim().split(/\s+/);
        const pid = Number.parseInt(parts[parts.length - 1], 10);
        if (pid > 0) pids.add(pid);
      }
    } else {
      try {
        const out = execSync(
          `lsof -tiTCP:${port} -sTCP:LISTEN 2>/dev/null || lsof -ti:${port} 2>/dev/null || true`,
          { encoding: "utf8", shell: true }
        );
        for (const part of out.split(/\s+/)) {
          const pid = Number.parseInt(part, 10);
          if (pid > 0) pids.add(pid);
        }
      } catch {
        // ignore
      }
      try {
        const out = execSync(`ss -ltnp 'sport = :${port}' 2>/dev/null || true`, {
          encoding: "utf8",
          shell: true,
        });
        for (const match of out.matchAll(/pid=(\d+)/g)) {
          pids.add(Number.parseInt(match[1], 10));
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // port was free / lookup failed
  }

  for (const pid of pids) {
    try {
      if (isWin) {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore", shell: true });
      } else {
        process.kill(pid, "SIGKILL");
      }
    } catch {
      // already exited
    }
  }
}

/**
 * Spawn `next start` detached via node (reliable on Windows; npm detached often dies).
 */
export function startNextServerDetached(port = 3000) {
  const nextBin = getNextBin();
  if (!existsSync(nextBin)) {
    throw new Error("Next.js not found. Run: npm install");
  }

  const logPath = join(process.cwd(), ".local-server.log");
  const pidPath = join(process.cwd(), ".local-server.pid");
  const logFd = openSync(logPath, "a");

  const stamp = new Date().toISOString();
  writeFileSync(logPath, `\n--- ${stamp} starting next on port ${port} ---\n`, { flag: "a" });

  const child = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: localProcessEnv(port),
    cwd: process.cwd(),
    windowsHide: true,
  });

  child.unref();
  if (child.pid) {
    writeFileSync(pidPath, String(child.pid), "utf8");
    writeFileSync(join(process.cwd(), ".local-server.port"), String(port), "utf8");
  }

  return child.pid;
}
