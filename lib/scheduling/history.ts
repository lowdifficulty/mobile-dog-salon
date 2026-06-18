import "server-only";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getRedisClient } from "./redis-client";
import type {
  AvailabilityDay,
  AvailabilityHistoryEntry,
  GroomerId,
  SchedulingData,
  WriteSchedulingMeta,
} from "./types";
import { getPersistenceMode } from "./persistence";

const HISTORY_FILE = path.join(process.cwd(), "data", "scheduling-history.json");
const HISTORY_KEY = "mds:scheduling:history";
const MAX_HISTORY = 100;

function groomerDayCount(data: SchedulingData, groomerId: GroomerId): number {
  return data.availability.filter((a) => a.groomerId === groomerId).length;
}

function groomerAvailabilityChanged(
  before: SchedulingData,
  after: SchedulingData,
  groomerId: GroomerId
): boolean {
  const pick = (data: SchedulingData) =>
    data.availability
      .filter((a) => a.groomerId === groomerId)
      .map((a) => ({ date: a.date, times: [...a.times].sort() }))
      .sort((a, b) => a.date.localeCompare(b.date));

  return JSON.stringify(pick(before)) !== JSON.stringify(pick(after));
}

function availabilityChanged(before: SchedulingData, after: SchedulingData): boolean {
  const norm = (data: SchedulingData) =>
    data.availability
      .map((a) => ({
        groomerId: a.groomerId,
        date: a.date,
        times: [...a.times].sort(),
      }))
      .sort((a, b) => `${a.groomerId}|${a.date}`.localeCompare(`${b.groomerId}|${b.date}`));

  return JSON.stringify(norm(before)) !== JSON.stringify(norm(after));
}

function buildSummary(
  meta: WriteSchedulingMeta,
  before: SchedulingData,
  after: SchedulingData
): string {
  if (meta.groomerId) {
    const beforeDays = groomerDayCount(before, meta.groomerId);
    const afterDays = groomerDayCount(after, meta.groomerId);
    if (meta.action === "groomer_erase") {
      return `${meta.groomerId}: cleared calendar (${beforeDays} days → 0 days)`;
    }
    if (meta.action === "groomer_save") {
      return `${meta.groomerId}: saved ${afterDays} day(s) with open hours`;
    }
    return `${meta.groomerId}: ${beforeDays} → ${afterDays} days`;
  }
  if (meta.action === "booking") {
    return "Booking removed hours from groomer availability";
  }
  if (meta.action === "admin_restore") {
    return "Admin restored a previous calendar snapshot";
  }
  return meta.action;
}

async function readHistoryFromFile(): Promise<AvailabilityHistoryEntry[]> {
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf8");
    const parsed = JSON.parse(raw) as AvailabilityHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeHistoryToFile(entries: AvailabilityHistoryEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true });
  await fs.writeFile(HISTORY_FILE, JSON.stringify(entries, null, 2) + "\n", "utf8");
}

export async function readAvailabilityHistory(): Promise<AvailabilityHistoryEntry[]> {
  const redis = getRedisClient();
  if (redis) {
    const entries = await redis.get<AvailabilityHistoryEntry[]>(HISTORY_KEY);
    return entries ?? [];
  }
  return readHistoryFromFile();
}

export async function appendAvailabilityHistory(
  before: SchedulingData,
  after: SchedulingData,
  meta: WriteSchedulingMeta
): Promise<void> {
  const shouldLog =
    meta.action === "admin_restore" ||
    meta.action === "system_init" ||
    meta.action === "system_migrate" ||
    (meta.groomerId
      ? groomerAvailabilityChanged(before, after, meta.groomerId)
      : availabilityChanged(before, after));

  if (!shouldLog) return;

  let action = meta.action;
  if (meta.groomerId && action === "groomer_save") {
    const beforeDays = groomerDayCount(before, meta.groomerId);
    const afterDays = groomerDayCount(after, meta.groomerId);
    if (afterDays === 0 && beforeDays > 0) {
      action = "groomer_erase";
    }
  }

  const entry: AvailabilityHistoryEntry = {
    id: randomUUID(),
    at: new Date().toISOString(),
    action,
    actor: meta.actor,
    groomerId: meta.groomerId,
    summary: buildSummary({ ...meta, action }, before, after),
    groomerDaysBefore: meta.groomerId
      ? groomerDayCount(before, meta.groomerId)
      : undefined,
    groomerDaysAfter: meta.groomerId
      ? groomerDayCount(after, meta.groomerId)
      : undefined,
    scheduling: structuredClone(after),
  };

  const redis = getRedisClient();
  if (redis) {
    const existing = await readAvailabilityHistory();
    const next = [entry, ...existing].slice(0, MAX_HISTORY);
    await redis.set(HISTORY_KEY, next);
    return;
  }

  if (getPersistenceMode() === "file") {
    const existing = await readHistoryFromFile();
    const next = [entry, ...existing].slice(0, MAX_HISTORY);
    await writeHistoryToFile(next);
  }
}

export async function getAvailabilityHistoryEntry(
  id: string
): Promise<AvailabilityHistoryEntry | null> {
  const entries = await readAvailabilityHistory();
  return entries.find((e) => e.id === id) ?? null;
}

export function listGroomerAvailability(
  data: SchedulingData,
  groomerId: GroomerId
): AvailabilityDay[] {
  return data.availability.filter((a) => a.groomerId === groomerId);
}
