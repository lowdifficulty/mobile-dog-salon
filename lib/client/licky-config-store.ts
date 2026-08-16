import "server-only";

import { promises as fs } from "fs";
import path from "path";
import { isVercelServerless } from "@/lib/scheduling/persistence";
import { getRedisClient } from "@/lib/scheduling/redis-client";

const FILE_PATH = path.join(process.cwd(), "data", "licky-config.json");
const REDIS_KEY = "mds:licky-config";
import { LICKY_CUSTOM_TEXT_MAX } from "@/lib/client/licky-config-constants";

export interface LickyConfig {
  customTrainingText: string;
  updatedAt?: string;
}

export function emptyLickyConfig(): LickyConfig {
  return { customTrainingText: "" };
}

async function readFromLocalFile(): Promise<LickyConfig> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as LickyConfig;
    return {
      customTrainingText: parsed.customTrainingText ?? "",
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return emptyLickyConfig();
  }
}

async function writeToLocalFile(config: LickyConfig): Promise<void> {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(config, null, 2) + "\n", "utf8");
}

export async function readLickyConfig(): Promise<LickyConfig> {
  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get<LickyConfig>(REDIS_KEY);
    if (data) {
      return {
        customTrainingText: data.customTrainingText ?? "",
        updatedAt: data.updatedAt,
      };
    }
    const seeded = await readFromLocalFile();
    await redis.set(REDIS_KEY, seeded);
    return seeded;
  }

  if (process.env.VERCEL && !isVercelServerless()) {
    return readFromLocalFile();
  }

  if (isVercelServerless()) {
    return emptyLickyConfig();
  }

  return readFromLocalFile();
}

export async function writeLickyConfig(customTrainingText: string): Promise<LickyConfig> {
  const trimmed = customTrainingText.trim();
  if (trimmed.length > LICKY_CUSTOM_TEXT_MAX) {
    throw new Error(`Custom text must be ${LICKY_CUSTOM_TEXT_MAX} characters or fewer`);
  }

  const config: LickyConfig = {
    customTrainingText: trimmed,
    updatedAt: new Date().toISOString(),
  };

  const redis = getRedisClient();
  if (redis) {
    await redis.set(REDIS_KEY, config);
  } else if (!isVercelServerless()) {
    await writeToLocalFile(config);
  } else {
    throw new Error("Licky config cannot be saved without Redis on production");
  }

  return config;
}

export async function getLickyCustomTrainingText(): Promise<string> {
  const config = await readLickyConfig();
  return config.customTrainingText.trim();
}

export { LICKY_CUSTOM_TEXT_MAX } from "@/lib/client/licky-config-constants";
