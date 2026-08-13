import "server-only";
import { crmPhoneDigits } from "./phone";
import { readCrmData, updateInteraction, writeCrmData } from "./store";
import type { CrmInteraction, CrmMessageStatus } from "./types";

const SMS_STATUS_RANK: Record<string, number> = {
  received: 0,
  queued: 1,
  sent: 2,
  delivered: 3,
  read: 4,
  undelivered: 50,
  failed: 50,
};

const RECENT_UNMATCHED_MS = 15 * 60 * 1000;

export function mapTwilioMessageStatus(raw: string): CrmMessageStatus | null {
  switch (raw.trim().toLowerCase()) {
    case "queued":
    case "accepted":
    case "scheduled":
    case "sending":
      return "queued";
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "undelivered":
      return "undelivered";
    case "failed":
      return "failed";
    case "received":
    case "receiving":
      return "received";
    default:
      return null;
  }
}

export function shouldApplySmsStatus(
  current: string | undefined,
  next: CrmMessageStatus
): boolean {
  if (!current || current === next) return true;
  if (current === "read" && next !== "failed" && next !== "undelivered") return false;
  if (next === "failed" || next === "undelivered") return current !== "read";
  return (SMS_STATUS_RANK[next] ?? 0) >= (SMS_STATUS_RANK[current] ?? 0);
}

function findSmsByTwilioSid(
  interactions: CrmInteraction[],
  sid: string
): CrmInteraction | undefined {
  return interactions.find((ix) => ix.channel === "sms" && ix.twilioSid === sid);
}

function findRecentUnmatchedOutboundSms(
  interactions: CrmInteraction[],
  toPhone: string
): CrmInteraction | undefined {
  const digits = crmPhoneDigits(toPhone);
  if (digits.length < 10) return undefined;
  const cutoff = Date.now() - RECENT_UNMATCHED_MS;
  const matches = interactions.filter((ix) => {
    if (ix.channel !== "sms" || ix.direction !== "outbound") return false;
    if (ix.actor !== "bot") return false;
    if (crmPhoneDigits(ix.phone) !== digits) return false;
    if (ix.twilioSid?.trim()) return false;
    return new Date(ix.createdAt).getTime() >= cutoff;
  });
  return matches.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export async function applyTwilioSmsStatus(options: {
  messageSid: string;
  messageStatus: string;
  to?: string;
  errorCode?: string;
  errorMessage?: string;
}): Promise<CrmInteraction | null> {
  const sid = options.messageSid.trim();
  if (!sid) return null;

  const mapped = mapTwilioMessageStatus(options.messageStatus);
  if (!mapped || mapped === "received") return null;

  const data = await readCrmData();
  const existing =
    findSmsByTwilioSid(data.interactions, sid) ||
    (options.to ? findRecentUnmatchedOutboundSms(data.interactions, options.to) : undefined);

  if (!existing) return null;
  if (!shouldApplySmsStatus(existing.messageStatus, mapped) && existing.twilioSid === sid) {
    return existing;
  }

  const patch: Partial<CrmInteraction> = {
    twilioSid: sid,
    metadata: {
      ...existing.metadata,
      twilioStatus: options.messageStatus.trim().toLowerCase(),
      errorCode: options.errorCode || existing.metadata?.errorCode || null,
      errorMessage: options.errorMessage || existing.metadata?.errorMessage || null,
    },
  };

  if (shouldApplySmsStatus(existing.messageStatus, mapped)) {
    patch.messageStatus = mapped;
  }

  return updateInteraction(existing.id, patch);
}

export async function markAppointmentSmsReadFromShortLink(options: {
  appointmentId: string;
  shortCode: string;
  phone: string;
}): Promise<number> {
  const digits = crmPhoneDigits(options.phone);
  if (digits.length < 10) return 0;

  const path = `/a/${options.shortCode.trim().toLowerCase()}`;
  const data = await readCrmData();
  const now = new Date().toISOString();
  let count = 0;

  for (let i = 0; i < data.interactions.length; i++) {
    const ix = data.interactions[i];
    if (ix.channel !== "sms" || ix.direction !== "outbound") continue;
    if (crmPhoneDigits(ix.phone) !== digits) continue;
    if (ix.messageStatus === "failed" || ix.messageStatus === "undelivered") continue;
    if (ix.messageStatus === "read") continue;

    const appointmentId = ix.metadata?.appointmentId;
    const matchesAppointment = appointmentId === options.appointmentId;
    const matchesLink = (ix.body ?? "").toLowerCase().includes(path);
    if (!matchesAppointment && !matchesLink) continue;

    data.interactions[i] = {
      ...ix,
      messageStatus: "read",
      readAt: now,
    };
    count += 1;
  }

  if (count > 0) await writeCrmData(data);
  return count;
}
