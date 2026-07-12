import "server-only";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getRedisClient } from "@/lib/scheduling/redis-client";
import { assertWritablePersistence } from "@/lib/scheduling/persistence";
import {
  INTERVIEW_PAY,
  INTERVIEW_ROLE_TITLE,
  isValidInterviewSlotKey,
  parseInterviewSlotKey,
  formatInterviewTimeLabel,
} from "./slots";
import type {
  InterviewBooking,
  InterviewBookingInput,
  InterviewBookingsData,
} from "./types";

const FILE_PATH = path.join(process.cwd(), "data", "interview-bookings.json");
const REDIS_KEY = "mds:interview-bookings";

export function emptyInterviewBookingsData(): InterviewBookingsData {
  return { bookings: [] };
}

async function readFromLocalFile(): Promise<InterviewBookingsData> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as InterviewBookingsData;
    return { bookings: parsed.bookings ?? [] };
  } catch {
    return emptyInterviewBookingsData();
  }
}

async function writeToLocalFile(data: InterviewBookingsData): Promise<void> {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function readInterviewBookingsData(): Promise<InterviewBookingsData> {
  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get<InterviewBookingsData>(REDIS_KEY);
    if (data) return { bookings: data.bookings ?? [] };
    const empty = emptyInterviewBookingsData();
    await redis.set(REDIS_KEY, empty);
    return empty;
  }

  if (process.env.VERCEL) {
    return emptyInterviewBookingsData();
  }

  return readFromLocalFile();
}

async function writeInterviewBookingsData(data: InterviewBookingsData): Promise<void> {
  assertWritablePersistence();
  const normalized: InterviewBookingsData = { bookings: data.bookings ?? [] };
  const redis = getRedisClient();
  if (redis) {
    await redis.set(REDIS_KEY, normalized);
  } else {
    await writeToLocalFile(normalized);
  }
}

export async function listInterviewBookings(): Promise<InterviewBooking[]> {
  const data = await readInterviewBookingsData();
  return [...data.bookings].sort((a, b) => {
    const slotCompare = a.slotKey.localeCompare(b.slotKey);
    if (slotCompare !== 0) return slotCompare;
    return b.bookedAt.localeCompare(a.bookedAt);
  });
}

export async function getBookedInterviewSlotKeys(): Promise<Set<string>> {
  const data = await readInterviewBookingsData();
  return new Set(data.bookings.map((b) => b.slotKey));
}

export async function isInterviewSlotTaken(slotKey: string): Promise<boolean> {
  const booked = await getBookedInterviewSlotKeys();
  return booked.has(slotKey);
}

export async function createInterviewBooking(
  input: InterviewBookingInput
): Promise<InterviewBooking> {
  if (!isValidInterviewSlotKey(input.slotKey)) {
    throw new Error("Invalid interview time slot.");
  }

  const data = await readInterviewBookingsData();
  if (data.bookings.some((b) => b.slotKey === input.slotKey)) {
    throw new Error("That interview time was just booked. Please choose another slot.");
  }

  const parsed = parseInterviewSlotKey(input.slotKey)!;
  const now = new Date().toISOString();
  const booking: InterviewBooking = {
    id: randomUUID(),
    slotKey: input.slotKey,
    date: parsed.date,
    time: formatInterviewTimeLabel(parsed.time24),
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    roleTitle: INTERVIEW_ROLE_TITLE,
    payDescription: INTERVIEW_PAY,
    bookedAt: now,
  };

  data.bookings.push(booking);
  await writeInterviewBookingsData(data);
  return booking;
}

export async function deleteInterviewBooking(id: string): Promise<boolean> {
  const data = await readInterviewBookingsData();
  const index = data.bookings.findIndex((b) => b.id === id);
  if (index === -1) return false;
  data.bookings.splice(index, 1);
  await writeInterviewBookingsData(data);
  return true;
}
