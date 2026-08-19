import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { getRedisClient } from "@/lib/scheduling/redis-client";
import { isVercelServerless } from "@/lib/scheduling/persistence";

const FILE_PATH = path.join(process.cwd(), "data", "meta-config.json");
const REDIS_KEY = "mds:meta-config";
const GRAPH_VERSION = "v21.0";

export interface MetaRuntimeConfig {
  appId?: string;
  appSecret?: string;
  pageId?: string;
  pageAccessToken?: string;
  instagramAccountId?: string;
  verifyToken?: string;
  webhookBaseUrl?: string;
  backfilledAt?: string;
  updatedAt?: string;
}

export function metaGraphVersion(): string {
  return GRAPH_VERSION;
}

export function emptyMetaRuntimeConfig(): MetaRuntimeConfig {
  return {};
}

async function readFromLocalFile(): Promise<MetaRuntimeConfig> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    return JSON.parse(raw) as MetaRuntimeConfig;
  } catch {
    return emptyMetaRuntimeConfig();
  }
}

async function writeToLocalFile(config: MetaRuntimeConfig): Promise<void> {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(config, null, 2) + "\n", "utf8");
}

export async function readMetaRuntimeConfig(): Promise<MetaRuntimeConfig> {
  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get<MetaRuntimeConfig>(REDIS_KEY);
    if (data) return data;
    const seeded = await readFromLocalFile();
    await redis.set(REDIS_KEY, seeded);
    return seeded;
  }
  if (isVercelServerless()) return emptyMetaRuntimeConfig();
  return readFromLocalFile();
}

export async function writeMetaRuntimeConfig(
  patch: Partial<MetaRuntimeConfig>
): Promise<MetaRuntimeConfig> {
  const current = await readMetaRuntimeConfig();
  const next: MetaRuntimeConfig = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  for (const key of [
    "appId",
    "appSecret",
    "pageId",
    "pageAccessToken",
    "instagramAccountId",
    "verifyToken",
  ] as const) {
    if (next[key]) next[key] = String(next[key]).trim();
  }
  if (next.webhookBaseUrl) {
    next.webhookBaseUrl = next.webhookBaseUrl.trim().replace(/\/$/, "");
  }

  const redis = getRedisClient();
  if (redis) {
    await redis.set(REDIS_KEY, next);
  } else if (!isVercelServerless()) {
    await writeToLocalFile(next);
  } else {
    throw new Error("Meta config requires Redis in production");
  }

  return next;
}

export async function resolveMetaAppId(): Promise<string | null> {
  return process.env.META_APP_ID?.trim() || (await readMetaRuntimeConfig()).appId?.trim() || null;
}

export async function resolveMetaAppSecret(): Promise<string | null> {
  return (
    process.env.META_APP_SECRET?.trim() ||
    (await readMetaRuntimeConfig()).appSecret?.trim() ||
    null
  );
}

export async function resolveMetaPageId(): Promise<string | null> {
  return process.env.META_PAGE_ID?.trim() || (await readMetaRuntimeConfig()).pageId?.trim() || null;
}

export async function resolveMetaPageAccessToken(): Promise<string | null> {
  return (
    process.env.META_PAGE_ACCESS_TOKEN?.trim() ||
    (await readMetaRuntimeConfig()).pageAccessToken?.trim() ||
    null
  );
}

export async function resolveMetaInstagramAccountId(): Promise<string | null> {
  return (
    process.env.META_INSTAGRAM_ACCOUNT_ID?.trim() ||
    (await readMetaRuntimeConfig()).instagramAccountId?.trim() ||
    null
  );
}

export async function resolveMetaVerifyToken(): Promise<string | null> {
  return (
    process.env.META_VERIFY_TOKEN?.trim() ||
    (await readMetaRuntimeConfig()).verifyToken?.trim() ||
    null
  );
}

export async function resolveMetaWebhookBase(): Promise<string | null> {
  const env =
    process.env.META_WEBHOOK_BASE_URL?.trim() ||
    process.env.QSTASH_CALLBACK_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const cfg = await readMetaRuntimeConfig();
  return cfg.webhookBaseUrl?.trim().replace(/\/$/, "") || null;
}

export function expectedMetaWebhookUrl(base: string): string {
  return `${base.replace(/\/$/, "")}/api/webhooks/meta`;
}

export async function metaStatus(): Promise<{
  configured: boolean;
  hasPageToken: boolean;
  hasPageId: boolean;
  hasAppSecret: boolean;
  hasVerifyToken: boolean;
  hasInstagram: boolean;
  mode: "env" | "runtime" | "none";
}> {
  const envToken = process.env.META_PAGE_ACCESS_TOKEN?.trim();
  const envPage = process.env.META_PAGE_ID?.trim();
  const cfg = await readMetaRuntimeConfig();
  const pageToken = envToken || cfg.pageAccessToken?.trim();
  const pageId = envPage || cfg.pageId?.trim();
  const appSecret =
    process.env.META_APP_SECRET?.trim() || cfg.appSecret?.trim() || null;
  const verifyToken =
    process.env.META_VERIFY_TOKEN?.trim() || cfg.verifyToken?.trim() || null;
  const instagram =
    process.env.META_INSTAGRAM_ACCOUNT_ID?.trim() ||
    cfg.instagramAccountId?.trim() ||
    null;

  const mode = envToken || envPage ? "env" : pageToken || pageId ? "runtime" : "none";

  return {
    configured: Boolean(pageToken && pageId),
    hasPageToken: Boolean(pageToken),
    hasPageId: Boolean(pageId),
    hasAppSecret: Boolean(appSecret),
    hasVerifyToken: Boolean(verifyToken),
    hasInstagram: Boolean(instagram),
    mode,
  };
}
