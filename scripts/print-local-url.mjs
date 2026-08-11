/**
 * Print the local site URL for agents/humans.
 * Usage: node scripts/print-local-url.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const portFile = join(root, ".local-server.port");
const envPort = process.env.LOCAL_PORT || process.env.PORT;
const port = existsSync(portFile)
  ? readFileSync(portFile, "utf8").trim()
  : envPort || "3000";

const url = `http://localhost:${port}`;
console.log(JSON.stringify({ port: Number(port) || port, url, pidFile: ".local-server.pid", logFile: ".local-server.log" }, null, 2));
