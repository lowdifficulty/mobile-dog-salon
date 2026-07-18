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
import { normalizeAppointmentVan } from "./vans";
import type { SchedulingData, WriteSchedulingMeta } from "./types";

const FILE_PATH = path.join(process.cwd(), "data", "scheduling.json");
const REDIS_KEY = "mds:scheduling";
const READ_CACHE_MS = 15_000;

let readCache: { data: SchedulingData; at: number } | null = null;

function cloneSchedulingData(data: SchedulingData): SchedulingData {
  return normalizeSchedulingData({
    availability: data.availability ?? [],
    appointments: data.appointments ?? [],
  });
}

export function normalizeSchedulingData(data: SchedulingData): SchedulingData {
  return {
    availability: data.availability ?? [],
    appointments: (data.appointments ?? []).map(normalizeAppointmentVan),
  };
}

export function invalidateSchedulingReadCache(): void {
  readCache = null;
}

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
  if (readCache && Date.now() - readCache.at < READ_CACHE_MS) {
    return cloneSchedulingData(readCache.data);
  }

  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get<SchedulingData>(REDIS_KEY);
    if (data) {
      const normalized = cloneSchedulingData(data);
      readCache = { data: normalized, at: Date.now() };
      return normalized;
    }

    const migrated = await migrateFileToRedis(redis);
    if (migrated) {
      const normalized = cloneSchedulingData(migrated);
      readCache = { data: normalized, at: Date.now() };
      return normalized;
    }

    const empty = emptySchedulingData();
    await redis.set(REDIS_KEY, empty);
    readCache = { data: empty, at: Date.now() };
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
  const normalized = normalizeSchedulingData({
    availability: data.availability ?? [],
    appointments: data.appointments ?? [],
  });

  const redis = getRedisClient();
  if (redis) {
    await redis.set(REDIS_KEY, normalized);
  } else {
    await writeToLocalFile(normalized);
  }

  if (meta) {
    await appendAvailabilityHistory(before, normalized, meta);
  }

  invalidateSchedulingReadCache();
}

export function getSchedulingPersistenceStatus() {
  return persistenceStatus();
}
