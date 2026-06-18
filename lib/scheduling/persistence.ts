import "server-only";

export type PersistenceMode = "redis" | "file" | "ephemeral";

export class PersistenceNotConfiguredError extends Error {
  readonly code = "PERSISTENCE_NOT_CONFIGURED";

  constructor(message?: string) {
    super(
      message ??
        "Groomer schedules are not persisted on this server. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN on Vercel."
    );
    this.name = "PersistenceNotConfiguredError";
  }
}

export function hasRedisEnv(): boolean {
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return Boolean(url && token);
}

/** Where availability + appointments are stored for this process. */
export function getPersistenceMode(): PersistenceMode {
  if (hasRedisEnv()) return "redis";
  if (process.env.VERCEL) return "ephemeral";
  return "file";
}

export function assertWritablePersistence(): void {
  const mode = getPersistenceMode();
  if (mode === "ephemeral") {
    throw new PersistenceNotConfiguredError();
  }
}

export function persistenceStatus(): {
  mode: PersistenceMode;
  writable: boolean;
  message: string;
} {
  const mode = getPersistenceMode();
  if (mode === "redis") {
    return {
      mode,
      writable: true,
      message: "Schedules are stored in Upstash Redis (persistent).",
    };
  }
  if (mode === "file") {
    return {
      mode,
      writable: true,
      message: "Schedules are stored in data/scheduling.json (local dev).",
    };
  }
  return {
    mode,
    writable: false,
    message:
      "Production has no Redis — schedules are lost on redeploy. Add Upstash Redis in Vercel env vars.",
  };
}
