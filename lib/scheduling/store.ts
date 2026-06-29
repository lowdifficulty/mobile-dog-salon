import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { getRedisClient } from "./redis-client";
import {
  assertWritablePersistence,
  getPersistenceMode,
  isVercelServerless,
  persistenceStatus,
} from "./persistence";
import { appendAvailabilityHistory } from "./history";
import type { SchedulingData, WriteSchedulingMeta } from "./types";

const FILE_PATH = path.join(process.cwd(), "data", "scheduling.json");
const REDIS_KEY = "mds:scheduling";

export function emptySchedulingData(): SchedulingData {
  return { availability: [], appointments: [] };
}

async function readFromLocalFile(): Promise<SchedulingData> {
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

async function writeToLocalFile(data: SchedulingData): Promise<void> {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function migrateFileToRedis(redis: NonNullable<ReturnType<typeof getRedisClient>>): Promise<SchedulingData | null> {
  const fileData = await readFromLocalFile();
  const hasData =
    fileData.availability.length > 0 || fileData.appointments.length > 0;
  if (!hasData) return null;

  await redis.set(REDIS_KEY, fileData);
  await appendAvailabilityHistory(emptySchedulingData(), fileData, {
    action: "system_migrate",
    actor: "system",
  });
  return fileData;
}

export async function readSchedulingData(): Promise<SchedulingData> {
  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get<SchedulingData>(REDIS_KEY);
    if (data) {
      return {
        availability: data.availability ?? [],
        appointments: data.appointments ?? [],
      };
    }

    const migrated = await migrateFileToRedis(redis);
    if (migrated) return migrated;

    const empty = emptySchedulingData();
    await redis.set(REDIS_KEY, empty);
    return empty;
  }

  if (process.env.VERCEL && !isVercelServerless()) {
    return readFromLocalFile();
  }

  if (isVercelServerless()) {
    return emptySchedulingData();
  }

  return readFromLocalFile();
}

export async function writeSchedulingData(
  data: SchedulingData,
  meta?: WriteSchedulingMeta
): Promise<void> {
  assertWritablePersistence();

  const before = await readSchedulingData();
  const normalized: SchedulingData = {
    availability: data.availability ?? [],
    appointments: data.appointments ?? [],
  };

  const redis = getRedisClient();
  if (redis) {
    await redis.set(REDIS_KEY, normalized);
  } else {
    await writeToLocalFile(normalized);
  }

  if (meta) {
    await appendAvailabilityHistory(before, normalized, meta);
  }
}

export function getSchedulingPersistenceStatus() {
  return persistenceStatus();
}
