import "server-only";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getRedisClient } from "@/lib/scheduling/redis-client";
import { assertWritablePersistence } from "@/lib/scheduling/persistence";
import type {
  FranchiseInquiry,
  FranchiseInquiryInput,
  FranchiseInquiriesData,
} from "./types";

const FILE_PATH = path.join(process.cwd(), "data", "franchise-inquiries.json");
const REDIS_KEY = "mds:franchise-inquiries";

export function emptyFranchiseInquiriesData(): FranchiseInquiriesData {
  return { inquiries: [] };
}

async function readFromLocalFile(): Promise<FranchiseInquiriesData> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as FranchiseInquiriesData;
    return { inquiries: parsed.inquiries ?? [] };
  } catch {
    return emptyFranchiseInquiriesData();
  }
}

async function writeToLocalFile(data: FranchiseInquiriesData): Promise<void> {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function readFranchiseInquiriesData(): Promise<FranchiseInquiriesData> {
  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get<FranchiseInquiriesData>(REDIS_KEY);
    if (data) return { inquiries: data.inquiries ?? [] };
    const empty = emptyFranchiseInquiriesData();
    await redis.set(REDIS_KEY, empty);
    return empty;
  }

  if (process.env.VERCEL) {
    return emptyFranchiseInquiriesData();
  }

  return readFromLocalFile();
}

async function writeFranchiseInquiriesData(data: FranchiseInquiriesData): Promise<void> {
  assertWritablePersistence();
  const normalized: FranchiseInquiriesData = { inquiries: data.inquiries ?? [] };
  const redis = getRedisClient();
  if (redis) {
    await redis.set(REDIS_KEY, normalized);
  } else {
    await writeToLocalFile(normalized);
  }
}

export async function createFranchiseInquiry(
  input: FranchiseInquiryInput
): Promise<FranchiseInquiry> {
  const data = await readFranchiseInquiriesData();
  const inquiry: FranchiseInquiry = {
    ...input,
    id: randomUUID(),
    submittedAt: new Date().toISOString(),
  };
  data.inquiries.unshift(inquiry);
  await writeFranchiseInquiriesData(data);
  return inquiry;
}
