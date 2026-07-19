import "server-only";

import { createHash } from "crypto";
import { randomUUID } from "crypto";
import { readSchedulingData } from "@/lib/scheduling/store";
import { bookingDurationMinutesForGroomer } from "@/lib/scheduling/groomers";
import { isSlotTaken, isVanSlotTaken, parseSlotKey } from "@/lib/scheduling/slots";
import { vanForGroomer } from "@/lib/scheduling/vans";
import { getRedisClient } from "@/lib/scheduling/redis-client";
import { hasRedisEnv, isVercelServerless } from "@/lib/scheduling/persistence";
import type { GroomerId } from "@/lib/scheduling/types";

/** How long a slot stays reserved while the customer finishes booking. */
export const SLOT_HOLD_TTL_SECONDS = 10 * 60;

const HOLD_INDEX_KEY = "mds:hold:keys";
const BLOCKED_CACHE_MS = 5_000;

let blockedCache: { keys: Set<string>; at: number; excludeOwnerId?: string } | null =
  null;

export interface SlotHold {
  holdId: string;
  slotKey: string;
  ownerId: string;
  createdAt: string;
  expiresAt: string;
}

export type SlotHoldResult =
  | { ok: true; holdId: string; expiresAt: string; slotKey: string }
  | { ok: false; error: string };

type MemoryEntry = { hold: SlotHold; expiresAtMs: number };

const memoryHolds = new Map<string, MemoryEntry>();
const memoryOwnerSlot = new Map<string, string>();

function holdKey(slotKey: string): string {
  return `mds:hold:${slotKey}`;
}

function ownerKey(ownerId: string): string {
  return `mds:hold:owner:${ownerId}`;
}

function clearBlockedCache(): void {
  blockedCache = null;
}

function isRedisWrongTypeError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("WRONGTYPE");
}

async function addHoldIndex(slotKey: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.sadd(HOLD_INDEX_KEY, slotKey);
  } catch (err) {
    if (!isRedisWrongTypeError(err)) throw err;
    await redis.del(HOLD_INDEX_KEY);
    await redis.sadd(HOLD_INDEX_KEY, slotKey);
  }
}

function expiryIso(ttlSeconds = SLOT_HOLD_TTL_SECONDS): string {
  return new Date(Date.now() + ttlSeconds * 1000).toISOString();
}

function pruneMemoryHolds(): void {
  const now = Date.now();
  for (const [slotKey, entry] of memoryHolds.entries()) {
    if (entry.expiresAtMs <= now) {
      memoryHolds.delete(slotKey);
      const owner = entry.hold.ownerId;
      if (memoryOwnerSlot.get(owner) === slotKey) {
        memoryOwnerSlot.delete(owner);
      }
    }
  }
}

function memoryGet(slotKey: string): SlotHold | null {
  pruneMemoryHolds();
  const entry = memoryHolds.get(slotKey);
  if (!entry) return null;
  if (entry.expiresAtMs <= Date.now()) {
    memoryHolds.delete(slotKey);
    return null;
  }
  return entry.hold;
}

function memorySet(slotKey: string, hold: SlotHold, ttlSeconds: number): void {
  memoryHolds.set(slotKey, {
    hold,
    expiresAtMs: Date.now() + ttlSeconds * 1000,
  });
  memoryOwnerSlot.set(hold.ownerId, slotKey);
}

function memoryDelete(slotKey: string): void {
  const entry = memoryHolds.get(slotKey);
  if (entry) {
    if (memoryOwnerSlot.get(entry.hold.ownerId) === slotKey) {
      memoryOwnerSlot.delete(entry.hold.ownerId);
    }
  }
  memoryHolds.delete(slotKey);
}

/** True when holds can be stored (Redis prod or in-memory local dev). */
export function slotHoldsSupported(): boolean {
  if (hasRedisEnv()) return true;
  return !isVercelServerless();
}

export function slotHoldsStatus(): {
  supported: boolean;
  backend: "redis" | "memory" | "none";
  ttlSeconds: number;
  message: string;
} {
  if (hasRedisEnv()) {
    return {
      supported: true,
      backend: "redis",
      ttlSeconds: SLOT_HOLD_TTL_SECONDS,
      message: `Slot holds use Upstash Redis (${SLOT_HOLD_TTL_SECONDS / 60}-minute TTL).`,
    };
  }
  if (!isVercelServerless()) {
    return {
      supported: true,
      backend: "memory",
      ttlSeconds: SLOT_HOLD_TTL_SECONDS,
      message: `Slot holds use in-memory storage in local dev (${SLOT_HOLD_TTL_SECONDS / 60}-minute TTL).`,
    };
  }
  return {
    supported: false,
    backend: "none",
    ttlSeconds: SLOT_HOLD_TTL_SECONDS,
    message:
      "Slot holds require Upstash Redis on Vercel — holds cannot persist across serverless instances without it.",
  };
}

async function readHold(slotKey: string): Promise<SlotHold | null> {
  const redis = getRedisClient();
  if (redis) {
    return (await redis.get<SlotHold>(holdKey(slotKey))) ?? null;
  }
  return memoryGet(slotKey);
}

async function writeHold(slotKey: string, hold: SlotHold): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    await redis.set(holdKey(slotKey), hold, { ex: SLOT_HOLD_TTL_SECONDS });
    await addHoldIndex(slotKey);
    await redis.set(ownerKey(hold.ownerId), slotKey, { ex: SLOT_HOLD_TTL_SECONDS });
    clearBlockedCache();
    return;
  }
  memorySet(slotKey, hold, SLOT_HOLD_TTL_SECONDS);
  clearBlockedCache();
}

async function deleteHold(slotKey: string, ownerId?: string): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    await redis.del(holdKey(slotKey));
    await redis.srem(HOLD_INDEX_KEY, slotKey);
    if (ownerId) {
      const current = await redis.get<string>(ownerKey(ownerId));
      if (current === slotKey) {
        await redis.del(ownerKey(ownerId));
      }
    }
    clearBlockedCache();
    return;
  }
  memoryDelete(slotKey);
  clearBlockedCache();
}

async function releaseOwnerPreviousHold(ownerId: string, slotKey: string): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    const prev = await redis.get<string>(ownerKey(ownerId));
    if (prev && prev !== slotKey) {
      await deleteHold(prev, ownerId);
    }
    return;
  }
  const prev = memoryOwnerSlot.get(ownerId);
  if (prev && prev !== slotKey) {
    memoryDelete(prev);
  }
}

/** Slot keys held by other customers (optionally excluding one owner). */
export async function getBlockedSlotKeys(excludeOwnerId?: string): Promise<Set<string>> {
  if (
    blockedCache &&
    blockedCache.excludeOwnerId === excludeOwnerId &&
    Date.now() - blockedCache.at < BLOCKED_CACHE_MS
  ) {
    return new Set(blockedCache.keys);
  }

  const blocked = new Set<string>();
  const redis = getRedisClient();

  if (redis) {
    let slotKeys: string[] = [];
    try {
      const raw = await redis.smembers<string[]>(HOLD_INDEX_KEY);
      slotKeys = Array.isArray(raw) ? raw : [];
    } catch (err) {
      if (!isRedisWrongTypeError(err)) throw err;
      await redis.del(HOLD_INDEX_KEY);
      blockedCache = { keys: blocked, at: Date.now(), excludeOwnerId };
      return blocked;
    }

    if (slotKeys.length === 0) {
      blockedCache = { keys: blocked, at: Date.now(), excludeOwnerId };
      return blocked;
    }

    const redisKeys = slotKeys.map((sk) => holdKey(sk));
    const holds = (await redis.mget<(SlotHold | null)[]>(...redisKeys)) ?? [];

    const stale: string[] = [];
    for (let i = 0; i < slotKeys.length; i++) {
      const slotKey = slotKeys[i];
      const hold = holds[i];
      if (!hold) {
        stale.push(slotKey);
        continue;
      }
      if (excludeOwnerId && hold.ownerId === excludeOwnerId) continue;
      blocked.add(slotKey);
    }

    // Expired hold keys linger in the index; prune a few per request (not all — avoids Upstash rate limits).
    if (stale.length > 0) {
      await Promise.all(
        stale.slice(0, 10).map((sk) => redis.srem(HOLD_INDEX_KEY, sk))
      );
    }

    blockedCache = { keys: blocked, at: Date.now(), excludeOwnerId };
    return blocked;
  }

  pruneMemoryHolds();
  for (const [slotKey, entry] of memoryHolds.entries()) {
    if (excludeOwnerId && entry.hold.ownerId === excludeOwnerId) continue;
    blocked.add(slotKey);
  }

  blockedCache = { keys: blocked, at: Date.now(), excludeOwnerId };
  return blocked;
}

export async function createSlotHold(
  ownerId: string,
  slotKey: string
): Promise<SlotHoldResult> {
  try {
    return await createSlotHoldInner(ownerId, slotKey);
  } catch (err) {
    console.error("createSlotHold error:", err);
    return {
      ok: false,
      error: "Could not reserve that time — please try again.",
    };
  }
}

async function createSlotHoldInner(
  ownerId: string,
  slotKey: string
): Promise<SlotHoldResult> {
  if (!slotHoldsSupported()) {
    return {
      ok: false,
      error: "Slot holds are not available on this server. Please try again later.",
    };
  }

  if (!ownerId?.trim()) {
    return { ok: false, error: "Missing session — refresh and try again." };
  }

  let groomerId: GroomerId;
  let date: string;
  let time: string;
  try {
    ({ groomerId, date, time } = parseSlotKey(slotKey));
  } catch {
    return { ok: false, error: "Invalid time slot." };
  }

  const data = await readSchedulingData();
  const visitDuration = bookingDurationMinutesForGroomer(groomerId);
  if (isSlotTaken(groomerId, date, time, visitDuration, data.appointments)) {
    return { ok: false, error: "That time was just booked — pick another." };
  }
  if (
    isVanSlotTaken(
      date,
      time,
      visitDuration,
      data.appointments,
      undefined,
      vanForGroomer(groomerId),
      data.availability,
      groomerId
    )
  ) {
    return { ok: false, error: "That van is already booked at that time — pick another." };
  }

  const existing = await readHold(slotKey);
  if (existing) {
    if (existing.ownerId === ownerId) {
      const refreshed: SlotHold = {
        ...existing,
        expiresAt: expiryIso(),
      };
      await writeHold(slotKey, refreshed);
      return {
        ok: true,
        holdId: refreshed.holdId,
        expiresAt: refreshed.expiresAt,
        slotKey,
      };
    }
    return { ok: false, error: "That time was just taken — pick another." };
  }

  await releaseOwnerPreviousHold(ownerId, slotKey);

  const hold: SlotHold = {
    holdId: randomUUID(),
    slotKey,
    ownerId,
    createdAt: new Date().toISOString(),
    expiresAt: expiryIso(),
  };

  const redis = getRedisClient();
  if (redis) {
    const created = await redis.set(holdKey(slotKey), hold, {
      nx: true,
      ex: SLOT_HOLD_TTL_SECONDS,
    });
    if (!created) {
      const raced = await readHold(slotKey);
      if (raced?.ownerId === ownerId) {
        return {
          ok: true,
          holdId: raced.holdId,
          expiresAt: raced.expiresAt,
          slotKey,
        };
      }
      return { ok: false, error: "That time was just taken — pick another." };
    }
    await addHoldIndex(slotKey);
    await redis.set(ownerKey(ownerId), slotKey, { ex: SLOT_HOLD_TTL_SECONDS });
    clearBlockedCache();
    return { ok: true, holdId: hold.holdId, expiresAt: hold.expiresAt, slotKey };
  }

  if (memoryGet(slotKey)) {
    return { ok: false, error: "That time was just taken — pick another." };
  }
  await writeHold(slotKey, hold);
  return { ok: true, holdId: hold.holdId, expiresAt: hold.expiresAt, slotKey };
}

export async function validateSlotHold(
  ownerId: string | undefined,
  slotKey: string
): Promise<{ ok: true; holdId: string } | { ok: false; error: string }> {
  if (!slotHoldsSupported()) {
    return { ok: true, holdId: "unsupported" };
  }

  if (!ownerId?.trim()) {
    return { ok: false, error: "Your hold expired — pick a time again." };
  }

  const hold = await readHold(slotKey);
  if (!hold) {
    return { ok: false, error: "Your hold expired — pick a time again." };
  }
  if (hold.ownerId !== ownerId) {
    return { ok: false, error: "That time slot is no longer available." };
  }
  if (new Date(hold.expiresAt).getTime() <= Date.now()) {
    return { ok: false, error: "Your hold expired — pick a time again." };
  }
  return { ok: true, holdId: hold.holdId };
}

export async function consumeSlotHold(
  ownerId: string | undefined,
  slotKey: string
): Promise<void> {
  if (!slotHoldsSupported() || !ownerId?.trim()) return;
  const hold = await readHold(slotKey);
  if (hold?.ownerId === ownerId) {
    await deleteHold(slotKey, ownerId);
  }
}

export async function releaseSlotHold(
  ownerId: string | undefined,
  slotKey: string
): Promise<void> {
  if (!slotHoldsSupported() || !ownerId?.trim()) return;
  const hold = await readHold(slotKey);
  if (hold?.ownerId === ownerId) {
    await deleteHold(slotKey, ownerId);
  }
}

/** QA: create, block, validate, consume without touching the live calendar. */
export async function testSlotHoldSystem(): Promise<{
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
}> {
  const status = slotHoldsStatus();
  if (!status.supported) {
    return { ok: false, message: status.message, details: { backend: status.backend } };
  }

  const ownerA = `qa-${randomUUID()}`;
  const ownerB = `qa-${randomUUID()}`;
  const slotKey = `melanie|2099-06-15|10:00`;

  try {
    const holdA = await createSlotHold(ownerA, slotKey);
    if (!holdA.ok) {
      return { ok: false, message: `Create hold failed: ${holdA.error}` };
    }

    const holdB = await createSlotHold(ownerB, slotKey);
    if (holdB.ok) {
      await releaseSlotHold(ownerA, slotKey);
      return { ok: false, message: "Second hold should have been rejected." };
    }

    const blocked = await getBlockedSlotKeys(ownerB);
    if (!blocked.has(slotKey)) {
      await releaseSlotHold(ownerA, slotKey);
      return { ok: false, message: "Held slot missing from blocked list." };
    }

    const valid = await validateSlotHold(ownerA, slotKey);
    if (!valid.ok) {
      await releaseSlotHold(ownerA, slotKey);
      return { ok: false, message: `Validate failed: ${valid.error}` };
    }

    await consumeSlotHold(ownerA, slotKey);

    const afterConsume = await validateSlotHold(ownerA, slotKey);
    if (afterConsume.ok) {
      return { ok: false, message: "Hold should be gone after consume." };
    }

    return {
      ok: true,
      message: `Slot holds working (${status.backend}, ${status.ttlSeconds / 60}-min TTL).`,
      details: {
        backend: status.backend,
        ttlSeconds: status.ttlSeconds,
      },
    };
  } catch (err) {
    await releaseSlotHold(ownerA, slotKey).catch(() => {});
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
