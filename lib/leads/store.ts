import "server-only";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getRedisClient } from "@/lib/scheduling/redis-client";
import { assertWritablePersistence } from "@/lib/scheduling/persistence";
import { normalizePhone } from "./normalize";
import {
  funnelStepOrder,
  type Lead,
  type LeadFunnelStep,
  type LeadNote,
  type LeadUpsertInput,
  type LeadsData,
} from "./types";

const FILE_PATH = path.join(process.cwd(), "data", "leads.json");
const REDIS_KEY = "mds:leads";

export function emptyLeadsData(): LeadsData {
  return { leads: [] };
}

async function readFromLocalFile(): Promise<LeadsData> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as LeadsData;
    return { leads: parsed.leads ?? [] };
  } catch {
    return emptyLeadsData();
  }
}

async function writeToLocalFile(data: LeadsData): Promise<void> {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function readLeadsData(): Promise<LeadsData> {
  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get<LeadsData>(REDIS_KEY);
    if (data) return { leads: data.leads ?? [] };
    const empty = emptyLeadsData();
    await redis.set(REDIS_KEY, empty);
    return empty;
  }

  if (process.env.VERCEL) {
    return emptyLeadsData();
  }

  return readFromLocalFile();
}

export async function writeLeadsData(data: LeadsData): Promise<void> {
  assertWritablePersistence();
  const normalized: LeadsData = { leads: data.leads ?? [] };
  const redis = getRedisClient();
  if (redis) {
    await redis.set(REDIS_KEY, normalized);
  } else {
    await writeToLocalFile(normalized);
  }
}

function findLeadIndex(data: LeadsData, input: LeadUpsertInput): number {
  const phone = input.phone ? normalizePhone(input.phone) : "";
  if (phone.length >= 10) {
    const byPhone = data.leads.findIndex(
      (l) => normalizePhone(l.phone) === phone
    );
    if (byPhone >= 0) return byPhone;
  }

  const email = input.email?.trim().toLowerCase();
  if (email) {
    const byEmail = data.leads.findIndex(
      (l) => l.email?.trim().toLowerCase() === email
    );
    if (byEmail >= 0) return byEmail;
  }

  if (input.leadSessionId) {
    return data.leads.findIndex((l) => l.leadSessionId === input.leadSessionId);
  }

  if (input.appointmentId) {
    return data.leads.findIndex((l) => l.appointmentId === input.appointmentId);
  }

  return -1;
}

function mergeFunnelStep(
  current: LeadFunnelStep,
  incoming: LeadFunnelStep
): LeadFunnelStep {
  return funnelStepOrder(incoming) >= funnelStepOrder(current)
    ? incoming
    : current;
}

function splitFullName(fullName?: string): { firstName?: string; lastName?: string } {
  if (!fullName?.trim()) return {};
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export async function upsertLead(input: LeadUpsertInput): Promise<Lead> {
  const data = await readLeadsData();
  const now = new Date().toISOString();
  const phone = input.phone ? normalizePhone(input.phone) : "";
  const idx = findLeadIndex(data, input);
  const nameParts = splitFullName(input.fullName);

  if (idx >= 0) {
    const existing = data.leads[idx];
    const updated: Lead = {
      ...existing,
      leadSessionId: input.leadSessionId ?? existing.leadSessionId,
      phone: phone || existing.phone,
      funnelStep: mergeFunnelStep(existing.funnelStep, input.funnelStep),
      firstName: input.firstName ?? nameParts.firstName ?? existing.firstName,
      lastName: input.lastName ?? nameParts.lastName ?? existing.lastName,
      fullName: input.fullName ?? existing.fullName,
      email: input.email?.trim() ?? existing.email,
      petName: input.petName ?? existing.petName,
      petSize: input.petSize ?? existing.petSize,
      pets: input.pets ?? existing.pets,
      service: input.service ?? existing.service,
      address: input.address ?? existing.address,
      city: input.city ?? existing.city,
      zipCode: input.zipCode ?? existing.zipCode,
      discountActive: input.discountActive ?? existing.discountActive,
      discountSkipped: input.discountSkipped ?? existing.discountSkipped,
      smsOptIn: input.smsOptIn ?? existing.smsOptIn,
      appointmentId: input.appointmentId ?? existing.appointmentId,
      scheduledAt: input.scheduledAt ?? existing.scheduledAt,
      source: input.source ?? existing.source,
      updatedAt: now,
    };
    data.leads[idx] = updated;
    await writeLeadsData(data);
    return updated;
  }

  const lead: Lead = {
    id: randomUUID(),
    leadSessionId: input.leadSessionId,
    phone,
    contactMadeAt: now,
    funnelStep: input.funnelStep,
    firstName: input.firstName ?? nameParts.firstName,
    lastName: input.lastName ?? nameParts.lastName,
    fullName: input.fullName,
    email: input.email?.trim(),
    petName: input.petName,
    petSize: input.petSize,
    pets: input.pets,
    service: input.service,
    address: input.address,
    city: input.city,
    zipCode: input.zipCode,
    discountActive: input.discountActive,
    discountSkipped: input.discountSkipped,
    smsOptIn: input.smsOptIn,
    appointmentId: input.appointmentId,
    scheduledAt: input.scheduledAt,
    notes: input.message
      ? [{ id: randomUUID(), text: input.message, createdAt: now }]
      : [],
    source: input.source ?? "booking",
    createdAt: now,
    updatedAt: now,
  };

  data.leads.push(lead);
  await writeLeadsData(data);
  return lead;
}

export async function addLeadNote(leadId: string, text: string): Promise<Lead | null> {
  const data = await readLeadsData();
  const idx = data.leads.findIndex((l) => l.id === leadId);
  if (idx < 0) return null;

  const note: LeadNote = {
    id: randomUUID(),
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };

  data.leads[idx] = {
    ...data.leads[idx],
    notes: [note, ...data.leads[idx].notes],
    updatedAt: note.createdAt,
  };

  await writeLeadsData(data);
  return data.leads[idx];
}

export async function getLeadById(leadId: string): Promise<Lead | null> {
  const data = await readLeadsData();
  return data.leads.find((l) => l.id === leadId) ?? null;
}
