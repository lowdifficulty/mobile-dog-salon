import "server-only";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getRedisClient } from "@/lib/scheduling/redis-client";
import { assertWritablePersistence } from "@/lib/scheduling/persistence";
import type {
  JobApplication,
  JobApplicationInput,
  JobApplicationsData,
} from "./types";

const FILE_PATH = path.join(process.cwd(), "data", "job-applications.json");
const REDIS_KEY = "mds:job-applications";

export function emptyJobApplicationsData(): JobApplicationsData {
  return { applications: [] };
}

async function readFromLocalFile(): Promise<JobApplicationsData> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as JobApplicationsData;
    return { applications: parsed.applications ?? [] };
  } catch {
    return emptyJobApplicationsData();
  }
}

async function writeToLocalFile(data: JobApplicationsData): Promise<void> {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function readJobApplicationsData(): Promise<JobApplicationsData> {
  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get<JobApplicationsData>(REDIS_KEY);
    if (data) return { applications: data.applications ?? [] };
    const empty = emptyJobApplicationsData();
    await redis.set(REDIS_KEY, empty);
    return empty;
  }

  if (process.env.VERCEL) {
    return emptyJobApplicationsData();
  }

  return readFromLocalFile();
}

async function writeJobApplicationsData(data: JobApplicationsData): Promise<void> {
  assertWritablePersistence();
  const normalized: JobApplicationsData = { applications: data.applications ?? [] };
  const redis = getRedisClient();
  if (redis) {
    await redis.set(REDIS_KEY, normalized);
  } else {
    await writeToLocalFile(normalized);
  }
}

export async function listJobApplications(): Promise<JobApplication[]> {
  const data = await readJobApplicationsData();
  return [...data.applications].sort((a, b) =>
    b.submittedAt.localeCompare(a.submittedAt)
  );
}

export async function createJobApplication(
  input: JobApplicationInput
): Promise<JobApplication> {
  const data = await readJobApplicationsData();
  const now = new Date().toISOString();
  const application: JobApplication = {
    id: randomUUID(),
    jobId: input.jobId,
    jobTitle: input.jobTitle,
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    message: input.message.trim(),
    resume: input.resume,
    submittedAt: now,
  };
  data.applications.push(application);
  await writeJobApplicationsData(data);
  return application;
}

export async function deleteJobApplication(id: string): Promise<boolean> {
  const data = await readJobApplicationsData();
  const index = data.applications.findIndex((a) => a.id === id);
  if (index === -1) return false;
  data.applications.splice(index, 1);
  await writeJobApplicationsData(data);
  return true;
}
