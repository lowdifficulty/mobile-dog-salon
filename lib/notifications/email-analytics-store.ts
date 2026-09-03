import "server-only";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getRedisClient } from "@/lib/scheduling/redis-client";
import { isVercelServerless } from "@/lib/scheduling/persistence";
import type { EmailTemplateId } from "./email-template-types";

const FILE_PATH = path.join(process.cwd(), "data", "email-analytics.json");
const REDIS_KEY = "mds:email-analytics";
const MAX_SENDS = 5000;

export type EmailEventType =
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained";

export interface EmailSendRecord {
  id: string;
  resendId?: string;
  templateId: EmailTemplateId;
  to: string;
  subject: string;
  appointmentId?: string;
  leadId?: string;
  sentAt: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  bouncedAt?: string;
  lastEventAt?: string;
  openCount: number;
  clickCount: number;
}

export interface EmailAnalyticsData {
  sends: EmailSendRecord[];
}

function emptyData(): EmailAnalyticsData {
  return { sends: [] };
}

async function readFromFile(): Promise<EmailAnalyticsData> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as EmailAnalyticsData;
    return { sends: parsed.sends ?? [] };
  } catch {
    return emptyData();
  }
}

async function writeToFile(data: EmailAnalyticsData): Promise<void> {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function readEmailAnalytics(): Promise<EmailAnalyticsData> {
  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get<EmailAnalyticsData>(REDIS_KEY);
    return { sends: data?.sends ?? [] };
  }
  if (isVercelServerless()) {
    return emptyData();
  }
  return readFromFile();
}

async function writeEmailAnalytics(data: EmailAnalyticsData): Promise<void> {
  const trimmed = {
    sends: data.sends.slice(-MAX_SENDS),
  };
  const redis = getRedisClient();
  if (redis) {
    await redis.set(REDIS_KEY, trimmed);
  } else if (!isVercelServerless()) {
    await writeToFile(trimmed);
  }
}

export async function logEmailSend(input: {
  resendId?: string;
  templateId: EmailTemplateId;
  to: string;
  subject: string;
  appointmentId?: string;
  leadId?: string;
}): Promise<EmailSendRecord> {
  const record: EmailSendRecord = {
    id: randomUUID(),
    resendId: input.resendId,
    templateId: input.templateId,
    to: input.to,
    subject: input.subject,
    appointmentId: input.appointmentId,
    leadId: input.leadId,
    sentAt: new Date().toISOString(),
    openCount: 0,
    clickCount: 0,
  };
  const data = await readEmailAnalytics();
  data.sends.push(record);
  await writeEmailAnalytics(data);
  return record;
}

export async function applyResendWebhookEvent(payload: {
  type: string;
  created_at?: string;
  data?: { email_id?: string; to?: string[] };
}): Promise<boolean> {
  const emailId = payload.data?.email_id;
  if (!emailId) return false;

  const data = await readEmailAnalytics();
  const index = data.sends.findIndex((s) => s.resendId === emailId);
  if (index === -1) return false;

  const now = payload.created_at ?? new Date().toISOString();
  const record = { ...data.sends[index] };
  record.lastEventAt = now;

  switch (payload.type) {
    case "email.delivered":
      record.deliveredAt = record.deliveredAt ?? now;
      break;
    case "email.opened":
      record.openCount += 1;
      record.openedAt = record.openedAt ?? now;
      break;
    case "email.clicked":
      record.clickCount += 1;
      record.clickedAt = record.clickedAt ?? now;
      break;
    case "email.bounced":
      record.bouncedAt = record.bouncedAt ?? now;
      break;
    default:
      return false;
  }

  data.sends[index] = record;
  await writeEmailAnalytics(data);
  return true;
}

export function summarizeEmailAnalytics(sends: EmailSendRecord[]) {
  const byTemplate: Record<
    string,
    { sent: number; delivered: number; opened: number; clicked: number; bounced: number }
  > = {};

  for (const s of sends) {
    const bucket = byTemplate[s.templateId] ?? {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
    };
    bucket.sent += 1;
    if (s.deliveredAt) bucket.delivered += 1;
    if (s.openedAt || s.openCount > 0) bucket.opened += 1;
    if (s.clickedAt || s.clickCount > 0) bucket.clicked += 1;
    if (s.bouncedAt) bucket.bounced += 1;
    byTemplate[s.templateId] = bucket;
  }

  const recent = [...sends].sort((a, b) => b.sentAt.localeCompare(a.sentAt)).slice(0, 100);

  return { byTemplate, recent, totalSent: sends.length };
}

function applyLastEventToRecord(
  record: EmailSendRecord,
  lastEvent: string,
  at: string
): EmailSendRecord {
  const next = { ...record, lastEventAt: at };
  switch (lastEvent) {
    case "delivered":
    case "opened":
    case "clicked":
      next.deliveredAt = next.deliveredAt ?? at;
      if (lastEvent === "opened" || lastEvent === "clicked") {
        next.openedAt = next.openedAt ?? at;
        if (!next.openCount) next.openCount = 1;
      }
      if (lastEvent === "clicked") {
        next.clickedAt = next.clickedAt ?? at;
        if (!next.clickCount) next.clickCount = 1;
      }
      break;
    case "bounced":
    case "failed":
    case "suppressed":
      next.bouncedAt = next.bouncedAt ?? at;
      break;
    case "complained":
      next.deliveredAt = next.deliveredAt ?? at;
      break;
    default:
      break;
  }
  return next;
}

/** Backfill delivery/open/click/bounce timestamps from Resend's email API. */
export async function syncEmailDeliveryFromResend(options?: {
  limit?: number;
}): Promise<{
  checked: number;
  updated: number;
  errors: number;
  errorSample?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const data = await readEmailAnalytics();
  const limit = Math.max(1, Math.min(options?.limit ?? 150, 500));

  const candidates = [...data.sends]
    .filter((s) => s.resendId)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
    .slice(0, limit);

  let updated = 0;
  let errors = 0;
  let errorSample: string | undefined;
  const byId = new Map(data.sends.map((s, index) => [s.id, index]));

  for (const candidate of candidates) {
    const index = byId.get(candidate.id);
    if (index === undefined || !candidate.resendId) continue;

    try {
      const got = await resend.emails.get(candidate.resendId);
      if (got.error || !got.data?.last_event) {
        errors += 1;
        if (!errorSample && got.error) {
          errorSample =
            typeof got.error.message === "string"
              ? got.error.message
              : "Resend email lookup failed";
        }
        continue;
      }
      const at = got.data.created_at ?? new Date().toISOString();
      const next = applyLastEventToRecord(candidate, got.data.last_event, at);
      const changed =
        next.deliveredAt !== candidate.deliveredAt ||
        next.openedAt !== candidate.openedAt ||
        next.clickedAt !== candidate.clickedAt ||
        next.bouncedAt !== candidate.bouncedAt ||
        next.openCount !== candidate.openCount ||
        next.clickCount !== candidate.clickCount;
      if (changed) {
        data.sends[index] = next;
        updated += 1;
      }
    } catch (err) {
      errors += 1;
      if (!errorSample) {
        errorSample = err instanceof Error ? err.message : "Resend email lookup failed";
      }
    }
  }

  if (updated > 0) {
    await writeEmailAnalytics(data);
  }

  if (errorSample && /restricted to only send emails/i.test(errorSample)) {
    errorSample = `${errorSample}. Delivery sync needs a Resend API key with read access (not send-only).`;
  }

  return { checked: candidates.length, updated, errors, errorSample };
}
