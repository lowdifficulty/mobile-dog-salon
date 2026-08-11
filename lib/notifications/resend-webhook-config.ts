import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { getRedisClient } from "@/lib/scheduling/redis-client";
import { isVercelServerless } from "@/lib/scheduling/persistence";

const FILE_PATH = path.join(process.cwd(), "data", "resend-webhook-config.json");
const REDIS_KEY = "mds:resend-webhook-config";

export interface ResendWebhookConfig {
  webhookId?: string;
  signingSecret?: string;
  endpoint?: string;
  updatedAt?: string;
}

function emptyConfig(): ResendWebhookConfig {
  return {};
}

async function readFromFile(): Promise<ResendWebhookConfig> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    return JSON.parse(raw) as ResendWebhookConfig;
  } catch {
    return emptyConfig();
  }
}

async function writeToFile(config: ResendWebhookConfig): Promise<void> {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(config, null, 2) + "\n", "utf8");
}

export async function readResendWebhookConfig(): Promise<ResendWebhookConfig> {
  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get<ResendWebhookConfig>(REDIS_KEY);
    return data ?? emptyConfig();
  }
  if (isVercelServerless()) return emptyConfig();
  return readFromFile();
}

export async function writeResendWebhookConfig(
  patch: Partial<ResendWebhookConfig>
): Promise<ResendWebhookConfig> {
  const current = await readResendWebhookConfig();
  const next: ResendWebhookConfig = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  const redis = getRedisClient();
  if (redis) {
    await redis.set(REDIS_KEY, next);
  } else if (!isVercelServerless()) {
    await writeToFile(next);
  }
  return next;
}

export async function resolveResendWebhookSecret(): Promise<string | undefined> {
  const env = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (env) return env;
  const runtime = await readResendWebhookConfig();
  return runtime.signingSecret?.trim() || undefined;
}
