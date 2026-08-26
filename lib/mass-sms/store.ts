import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { getRedisClient } from "@/lib/scheduling/redis-client";
import { assertWritablePersistence, isVercelServerless } from "@/lib/scheduling/persistence";
import type { MassSmsCampaignData, MassSmsSentRecord } from "./types";

const FILE_PATH = path.join(process.cwd(), "data", "mass-sms-campaign.json");
const REDIS_KEY = "mds:mass-sms-campaign";
const READ_CACHE_MS = 5_000;

let readCache: { data: MassSmsCampaignData; at: number } | null = null;

/** Monday of the current week in America/Los_Angeles (YYYY-MM-DD). */
export function currentCampaignWeek(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";

  const weekdayIndex: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const offset = weekdayIndex[weekday] ?? 0;
  const local = new Date(Date.UTC(year, month - 1, day));
  local.setUTCDate(local.getUTCDate() - offset);
  return local.toISOString().slice(0, 10);
}

export function emptyCampaignData(week = currentCampaignWeek()): MassSmsCampaignData {
  return { campaignWeek: week, sent: [] };
}

async function readFromLocalFile(): Promise<MassSmsCampaignData> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    return JSON.parse(raw) as MassSmsCampaignData;
  } catch {
    return emptyCampaignData();
  }
}

async function writeToLocalFile(data: MassSmsCampaignData): Promise<void> {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function normalizeCampaignData(data: MassSmsCampaignData): MassSmsCampaignData {
  const week = currentCampaignWeek();
  if (data.campaignWeek !== week) {
    return emptyCampaignData(week);
  }
  return {
    campaignWeek: week,
    sent: data.sent ?? [],
    lastBatchAt: data.lastBatchAt,
  };
}

export async function readMassSmsCampaign(): Promise<MassSmsCampaignData> {
  if (readCache && Date.now() - readCache.at < READ_CACHE_MS) {
    return normalizeCampaignData(readCache.data);
  }

  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get<MassSmsCampaignData>(REDIS_KEY);
    const normalized = normalizeCampaignData(data ?? emptyCampaignData());
    readCache = { data: normalized, at: Date.now() };
    return normalized;
  }

  if (isVercelServerless()) {
    return emptyCampaignData();
  }

  const normalized = normalizeCampaignData(await readFromLocalFile());
  readCache = { data: normalized, at: Date.now() };
  return normalized;
}

export async function writeMassSmsCampaign(data: MassSmsCampaignData): Promise<void> {
  assertWritablePersistence();
  const normalized = normalizeCampaignData(data);
  readCache = { data: normalized, at: Date.now() };

  const redis = getRedisClient();
  if (redis) {
    await redis.set(REDIS_KEY, normalized);
    return;
  }

  await writeToLocalFile(normalized);
}

export async function appendMassSmsSent(records: MassSmsSentRecord[]): Promise<MassSmsCampaignData> {
  const data = await readMassSmsCampaign();
  data.sent.push(...records);
  data.lastBatchAt = new Date().toISOString();
  await writeMassSmsCampaign(data);
  return data;
}

export function phonesSentThisWeek(data: MassSmsCampaignData): Set<string> {
  return new Set(data.sent.map((r) => r.phoneKey));
}
