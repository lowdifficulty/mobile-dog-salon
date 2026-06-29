import "server-only";

import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getLeadById, readLeadsData, writeLeadsData } from "@/lib/leads/store";
import type { ClientPhoto } from "@/lib/leads/types";
import { getRedisClient } from "@/lib/scheduling/redis-client";
import type { GroomerId } from "@/lib/scheduling/types";

const MAX_PHOTOS_PER_LEAD = 12;
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const REDIS_PREFIX = "mds:client-photo:";
const LOCAL_FILE = path.join(process.cwd(), "data", "client-photos.json");

interface StoredClientPhoto {
  leadId: string;
  groomerId: GroomerId;
  mimeType: string;
  data: string;
  petName?: string;
  caption?: string;
  createdAt: string;
}

type LocalPhotoStore = Record<string, StoredClientPhoto>;

async function readLocalStore(): Promise<LocalPhotoStore> {
  try {
    const raw = await fs.readFile(LOCAL_FILE, "utf8");
    return JSON.parse(raw) as LocalPhotoStore;
  } catch {
    return {};
  }
}

async function writeLocalStore(store: LocalPhotoStore): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(store) + "\n", "utf8");
}

async function readStoredPhoto(photoId: string): Promise<StoredClientPhoto | null> {
  const redis = getRedisClient();
  if (redis) {
    return (await redis.get<StoredClientPhoto>(`${REDIS_PREFIX}${photoId}`)) ?? null;
  }
  const store = await readLocalStore();
  return store[photoId] ?? null;
}

async function writeStoredPhoto(photoId: string, photo: StoredClientPhoto): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    await redis.set(`${REDIS_PREFIX}${photoId}`, photo);
    return;
  }
  const store = await readLocalStore();
  store[photoId] = photo;
  await writeLocalStore(store);
}

async function deleteStoredPhoto(photoId: string): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    await redis.del(`${REDIS_PREFIX}${photoId}`);
    return;
  }
  const store = await readLocalStore();
  delete store[photoId];
  await writeLocalStore(store);
}

export function clientPhotoUrl(photoId: string): string {
  return `/api/groomer/clients/photos/${photoId}`;
}

export async function addClientPhoto(
  leadId: string,
  groomerId: GroomerId,
  file: File,
  petName?: string,
  caption?: string
): Promise<
  { ok: true; photo: ClientPhoto } | { ok: false; error: string; status: number }
> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Use a JPEG, PNG, or WebP image.", status: 400 };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > MAX_BYTES) {
    return { ok: false, error: "Image must be 4 MB or smaller.", status: 400 };
  }

  const lead = await getLeadById(leadId);
  if (!lead) {
    return { ok: false, error: "Client not found", status: 404 };
  }

  const photos = lead.photos ?? [];
  if (photos.length >= MAX_PHOTOS_PER_LEAD) {
    return {
      ok: false,
      error: `Maximum ${MAX_PHOTOS_PER_LEAD} photos per client.`,
      status: 400,
    };
  }

  const photoId = randomUUID();
  const createdAt = new Date().toISOString();
  const trimmedPetName = petName?.trim() || undefined;
  const trimmedCaption = caption?.trim() || undefined;

  await writeStoredPhoto(photoId, {
    leadId,
    groomerId,
    mimeType: file.type,
    data: bytes.toString("base64"),
    petName: trimmedPetName,
    caption: trimmedCaption,
    createdAt,
  });

  const meta: ClientPhoto = {
    id: photoId,
    petName: trimmedPetName,
    caption: trimmedCaption,
    createdAt,
  };

  const data = await readLeadsData();
  const index = data.leads.findIndex((l) => l.id === leadId);
  if (index < 0) {
    return { ok: false, error: "Client not found", status: 404 };
  }

  data.leads[index] = {
    ...data.leads[index],
    photos: [meta, ...(data.leads[index].photos ?? [])],
    updatedAt: createdAt,
  };
  await writeLeadsData(data);

  return { ok: true, photo: meta };
}

export async function removeClientPhoto(
  photoId: string,
  groomerId: GroomerId
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const stored = await readStoredPhoto(photoId);
  if (!stored) {
    return { ok: false, error: "Photo not found", status: 404 };
  }
  if (stored.groomerId !== groomerId) {
    return { ok: false, error: "Not your client photo", status: 403 };
  }

  const data = await readLeadsData();
  const index = data.leads.findIndex((l) => l.id === stored.leadId);
  if (index >= 0) {
    data.leads[index] = {
      ...data.leads[index],
      photos: (data.leads[index].photos ?? []).filter((p) => p.id !== photoId),
      updatedAt: new Date().toISOString(),
    };
    await writeLeadsData(data);
  }

  await deleteStoredPhoto(photoId);
  return { ok: true };
}

export async function getClientPhotoBytes(
  photoId: string,
  groomerId: GroomerId
): Promise<
  | { ok: true; mimeType: string; bytes: Buffer }
  | { ok: false; error: string; status: number }
> {
  const stored = await readStoredPhoto(photoId);
  if (!stored) {
    return { ok: false, error: "Photo not found", status: 404 };
  }
  if (stored.groomerId !== groomerId) {
    return { ok: false, error: "Not your client photo", status: 403 };
  }

  return {
    ok: true,
    mimeType: stored.mimeType,
    bytes: Buffer.from(stored.data, "base64"),
  };
}
