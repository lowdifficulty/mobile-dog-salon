import { hasRedisEnv } from "@/lib/scheduling/persistence";

/** True when the request targets a local dev server (not production). */
export function isLocalhostRequest(request: Request): boolean {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

/**
 * Localhost without production Redis uses fake slots and relaxed booking rules
 * only when LOCALHOST_DEV_FALLBACK_SLOTS=1 (empty local dev convenience).
 * Default: use pulled data/scheduling.json or live Redis when configured.
 */
export function isLocalhostDevWithoutProductionData(request: Request): boolean {
  if (!isLocalhostRequest(request)) return false;
  if (hasRedisEnv()) return false;
  return process.env.LOCALHOST_DEV_FALLBACK_SLOTS === "1";
}
