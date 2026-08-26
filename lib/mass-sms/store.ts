import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { getRedisClient } from "@/lib/scheduling/redis-client";
import { assertWritablePersistence, isVercelServerless } from "@/lib/scheduling/persistence";
import type { MassSmsCampaignData, MassSmsCampaignKind, MassSmsSentRecord } from "./types";

function filePathForKind(kind: MassSmsCampaignKind): string {
  const suffix =
    kind === "lead-nurture" ? "lead-nurture" : kind === "cancelled" ? "cancelled" : "rebook";
  return path.join(process.cwd(), "data", `mass-sms-campaign-${suffix}.json`);
}

function redisKeyForKind(kind: MassSmsCampaignKind): string {
  if (kind === "lead-nurture") return "mds:mass-sms-campaign:lead-nurture";
  if (kind === "cancelled") return "mds:mass-sms-campaign:cancelled";
  return "mds:mass-sms-campaign:rebook";
}

const readCacheByKind = new Map<
  MassSmsCampaignKind,
  { data: MassSmsCampaignData; at: number }
>();
const READ_CACHE_MS = 5_000;

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

async function readFromLocalFile(kind: MassSmsCampaignKind): Promise<MassSmsCampaignData> {
  const filePath = filePathForKind(kind);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as MassSmsCampaignData;
  } catch {
    // Legacy single-file campaign (rebook only)
    if (kind === "rebook") {
      try {
        const legacy = path.join(process.cwd(), "data", "mass-sms-campaign.json");
        const raw = await fs.readFile(legacy, "utf8");
        return JSON.parse(raw) as MassSmsCampaignData;
      } catch {
        return emptyCampaignData();
      }
    }
    return emptyCampaignData();
  }
}

async function writeToLocalFile(
  kind: MassSmsCampaignKind,
  data: MassSmsCampaignData
): Promise<void> {
  const filePath = filePathForKind(kind);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
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

export async function readMassSmsCampaign(
  kind: MassSmsCampaignKind = "rebook"
): Promise<MassSmsCampaignData> {
  const cached = readCacheByKind.get(kind);
  if (cached && Date.now() - cached.at < READ_CACHE_MS) {
    return normalizeCampaignData(cached.data);
  }

  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get<MassSmsCampaignData>(redisKeyForKind(kind));
    const normalized = normalizeCampaignData(data ?? emptyCampaignData());
    readCacheByKind.set(kind, { data: normalized, at: Date.now() });
    return normalized;
  }

  if (isVercelServerless()) {
    return emptyCampaignData();
  }

  const normalized = normalizeCampaignData(await readFromLocalFile(kind));
  readCacheByKind.set(kind, { data: normalized, at: Date.now() });
  return normalized;
}

export async function writeMassSmsCampaign(
  kind: MassSmsCampaignKind,
  data: MassSmsCampaignData
): Promise<void> {
  assertWritablePersistence();
  const normalized = normalizeCampaignData(data);
  readCacheByKind.set(kind, { data: normalized, at: Date.now() });

  const redis = getRedisClient();
  if (redis) {
    await redis.set(redisKeyForKind(kind), normalized);
    return;
  }

  await writeToLocalFile(kind, normalized);
}

export async function appendMassSmsSent(
  kind: MassSmsCampaignKind,
  records: MassSmsSentRecord[]
): Promise<MassSmsCampaignData> {
  const data = await readMassSmsCampaign(kind);
  data.sent.push(...records);
  data.lastBatchAt = new Date().toISOString();
  await writeMassSmsCampaign(kind, data);
  return data;
}

export function phonesSentThisWeek(data: MassSmsCampaignData): Set<string> {
  return new Set(data.sent.map((r) => r.phoneKey));
}
