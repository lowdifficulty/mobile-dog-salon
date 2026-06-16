import { readFileSync } from "node:fs";
import { SquareClient, SquareEnvironment } from "square";

try {
  const envPath = new URL("../.env.local", import.meta.url);
  const envFile = readFileSync(envPath, "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key && value) process.env[key] = value;
  }
} catch {
  // use existing env
}

const token = process.env.SQUARE_ACCESS_TOKEN;
if (!token) {
  console.error("Set SQUARE_ACCESS_TOKEN");
  process.exit(1);
}

const client = new SquareClient({ token, environment: SquareEnvironment.Sandbox });
const response = await client.locations.list();
for (const loc of response.locations ?? []) {
  console.log(`${loc.id} | ${loc.name ?? "unnamed"} | ${loc.status ?? ""}`);
}
