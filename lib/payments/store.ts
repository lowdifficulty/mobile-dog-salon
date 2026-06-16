import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import type { ClientAccount, ClientsData } from "./types";

const FILE_PATH = path.join(process.cwd(), "data", "clients.json");
const TMP_PATH = path.join("/tmp", "mds-clients.json");
const REDIS_KEY = "mds:clients";

export function emptyClientsData(): ClientsData {
  return { clients: [] };
}

function getRedisClient(): Redis | null {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return Redis.fromEnv();
  }
  return null;
}

async function readFromFile(): Promise<ClientsData> {
  const paths = process.env.VERCEL ? [TMP_PATH, FILE_PATH] : [FILE_PATH];
  for (const p of paths) {
    try {
      const raw = await fs.readFile(p, "utf8");
      const parsed = JSON.parse(raw) as ClientsData;
      return { clients: parsed.clients ?? [] };
    } catch {
      // try next
    }
  }
  return emptyClientsData();
}

async function writeToFile(data: ClientsData): Promise<void> {
  const json = JSON.stringify(data, null, 2) + "\n";
  const target = process.env.VERCEL ? TMP_PATH : FILE_PATH;
  if (!process.env.VERCEL) {
    await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  }
  await fs.writeFile(target, json, "utf8");
}

export async function readClientsData(): Promise<ClientsData> {
  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get<ClientsData>(REDIS_KEY);
    if (data) return data;
    const seeded = await readFromFile();
    await redis.set(REDIS_KEY, seeded);
    return seeded;
  }
  return readFromFile();
}

export async function writeClientsData(data: ClientsData): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    await redis.set(REDIS_KEY, data);
    return;
  }
  await writeToFile(data);
}

export async function findClientByEmail(email: string): Promise<ClientAccount | null> {
  const data = await readClientsData();
  const normalized = email.trim().toLowerCase();
  return data.clients.find((c) => c.email.toLowerCase() === normalized) ?? null;
}

export async function findClientById(id: string): Promise<ClientAccount | null> {
  const data = await readClientsData();
  return data.clients.find((c) => c.id === id) ?? null;
}

export async function createClient(account: ClientAccount): Promise<void> {
  const data = await readClientsData();
  data.clients.push(account);
  await writeClientsData(data);
}

export async function listClientSummaries(): Promise<
  Array<{ id: string; email: string; firstName: string; lastName: string }>
> {
  const data = await readClientsData();
  return data.clients.map((c) => ({
    id: c.id,
    email: c.email,
    firstName: c.firstName,
    lastName: c.lastName,
  }));
}
