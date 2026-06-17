import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import type { SchedulingData } from "./types";

const FILE_PATH = path.join(process.cwd(), "data", "scheduling.json");
const TMP_PATH = path.join("/tmp", "mds-scheduling.json");
const REDIS_KEY = "mds:scheduling";

export function emptySchedulingData(): SchedulingData {
  return { availability: [], appointments: [] };
}

function getRedisClient(): Redis | null {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return Redis.fromEnv();
  }
  return null;
}

async function readFromFile(): Promise<SchedulingData> {
  if (process.env.VERCEL) {
    // Ephemeral /tmp only — never read bundled data/scheduling.json (may contain stale demo data).
    try {
      const raw = await fs.readFile(TMP_PATH, "utf8");
      const parsed = JSON.parse(raw) as SchedulingData;
      return {
        availability: parsed.availability ?? [],
        appointments: parsed.appointments ?? [],
      };
    } catch {
      return emptySchedulingData();
    }
  }

  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as SchedulingData;
    return {
      availability: parsed.availability ?? [],
      appointments: parsed.appointments ?? [],
    };
  } catch {
    return emptySchedulingData();
  }
}

async function writeToFile(data: SchedulingData): Promise<void> {
  const json = JSON.stringify(data, null, 2) + "\n";
  const target = process.env.VERCEL ? TMP_PATH : FILE_PATH;
  if (!process.env.VERCEL) {
    await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  }
  await fs.writeFile(target, json, "utf8");
  if (process.env.VERCEL && target === TMP_PATH) {
    try {
      await fs.writeFile(FILE_PATH, json, "utf8");
    } catch {
      // read-only filesystem on Vercel deploy bundle
    }
  }
}

export async function readSchedulingData(): Promise<SchedulingData> {
  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get<SchedulingData>(REDIS_KEY);
    if (data) return data;
    const empty = emptySchedulingData();
    await redis.set(REDIS_KEY, empty);
    return empty;
  }
  return readFromFile();
}

export async function writeSchedulingData(data: SchedulingData): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    await redis.set(REDIS_KEY, data);
    return;
  }
  await writeToFile(data);
}
