import "server-only";
import twilio from "twilio";
import { readSchedulingData } from "@/lib/scheduling/store";
import { getAvailableSlotsForDate } from "@/lib/scheduling/slots";
import { persistenceStatus } from "@/lib/scheduling/persistence";
import type { GroomerId } from "@/lib/scheduling/types";
import { GROOMERS } from "@/lib/scheduling/groomers";
import { getRedisClient } from "@/lib/scheduling/redis-client";

export type QaCheckStatus = "working" | "not_working" | "warning";

export interface QaCheckResult {
  id: string;
  label: string;
  status: QaCheckStatus;
  message: string;
  details?: Record<string, string | number | boolean>;
}

export interface QaDiagnosticReport {
  ranAt: string;
  trigger: "cron" | "manual";
  overall: QaCheckStatus;
  checks: QaCheckResult[];
}

const QA_REDIS_KEY = "mds:qa-report";
const SITE_URL =
  process.env.QA_SITE_URL?.trim() ||
  process.env.QSTASH_CALLBACK_URL?.trim() ||
  "https://mobiledog-salon.com";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function overallStatus(checks: QaCheckResult[]): QaCheckStatus {
  if (checks.some((c) => c.status === "not_working")) return "not_working";
  if (checks.some((c) => c.status === "warning")) return "warning";
  return "working";
}

async function checkWebsite(): Promise<QaCheckResult> {
  const id = "website";
  const label = "Website running";
  try {
    const res = await fetch(SITE_URL, {
      method: "GET",
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "MobileDogSalon-QA/1.0" },
    });
    const html = await res.text();
    const ok = res.ok && html.includes("Mobile Dog Salon");
    return {
      id,
      label,
      status: ok ? "working" : "not_working",
      message: ok
        ? `Homepage responded HTTP ${res.status}.`
        : `Homepage returned HTTP ${res.status} or unexpected content.`,
      details: { url: SITE_URL, statusCode: res.status },
    };
  } catch (err) {
    return {
      id,
      label,
      status: "not_working",
      message: err instanceof Error ? err.message : "Website request failed",
      details: { url: SITE_URL },
    };
  }
}

async function checkEmail(): Promise<QaCheckResult> {
  const id = "email";
  const label = "Emails sending (Resend)";
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    return {
      id,
      label,
      status: "not_working",
      message: "RESEND_API_KEY is not set — confirmation and reminder emails will not send.",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return {
        id,
        label,
        status: "not_working",
        message: `Resend API rejected credentials (HTTP ${res.status}).`,
      };
    }
    const body = (await res.json()) as { data?: { name: string; status: string }[] };
    const verified = body.data?.filter((d) => d.status === "verified") ?? [];
    return {
      id,
      label,
      status: verified.length > 0 ? "working" : "warning",
      message:
        verified.length > 0
          ? `Resend connected. ${verified.length} verified domain(s).`
          : "Resend API key works but no verified sending domain found.",
      details: { verifiedDomains: verified.length },
    };
  } catch (err) {
    return {
      id,
      label,
      status: "warning",
      message: `RESEND_API_KEY is set but API check failed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

async function checkSms(): Promise<QaCheckResult> {
  const id = "sms";
  const label = "SMS working (Twilio)";
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim();
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();

  if (!accountSid || !from) {
    return {
      id,
      label,
      status: "not_working",
      message: "Missing TWILIO_ACCOUNT_SID or TWILIO_FROM_NUMBER.",
    };
  }

  if (!(apiKeySid && apiKeySecret) && !authToken) {
    return {
      id,
      label,
      status: "not_working",
      message: "Twilio credentials incomplete (need API key or auth token).",
    };
  }

  try {
    const client =
      apiKeySid && apiKeySecret
        ? twilio(apiKeySid, apiKeySecret, { accountSid })
        : twilio(accountSid, authToken!);

    const account = await client.api.accounts(accountSid).fetch();
    const numbers = await client.incomingPhoneNumbers.list({ limit: 20 });
    const hasFrom = numbers.some((n) => n.phoneNumber === from);

    const accountOk = account.status === "active";
    return {
      id,
      label,
      status: accountOk && hasFrom ? "working" : "warning",
      message: accountOk
        ? hasFrom
          ? `Twilio account active. Sender ${from} is on this account.`
          : `Twilio active but TWILIO_FROM_NUMBER ${from} not found on account.`
        : `Twilio account status: ${account.status}.`,
      details: {
        accountStatus: account.status ?? "unknown",
        fromNumberConfigured: hasFrom,
      },
    };
  } catch (err) {
    return {
      id,
      label,
      status: "not_working",
      message: err instanceof Error ? err.message : "Twilio connection failed",
    };
  }
}

function groomerCalendarCheck(
  groomerId: GroomerId,
  availabilityDays: { groomerId: GroomerId; date: string; times: string[] }[],
  bookableSlots: number
): QaCheckResult {
  const name = GROOMERS[groomerId].name;
  const id = `${groomerId}_calendar`;
  const label = `${name}'s calendar`;
  const today = todayISO();
  const horizon = addDaysISO(today, 30);

  const futureDays = availabilityDays.filter(
    (d) =>
      d.groomerId === groomerId &&
      d.date >= today &&
      d.date <= horizon &&
      d.times.length > 0
  );

  if (futureDays.length === 0) {
    return {
      id,
      label,
      status: "not_working",
      message: `No availability published for ${name} in the next 30 days.`,
      details: { availabilityDays: 0, bookableSlots },
    };
  }

  if (bookableSlots === 0) {
    return {
      id,
      label,
      status: "warning",
      message: `${name} has ${futureDays.length} day(s) on the calendar but no open bookable slots (may be fully booked).`,
      details: { availabilityDays: futureDays.length, bookableSlots: 0 },
    };
  }

  return {
    id,
    label,
    status: "working",
    message: `${name} has ${futureDays.length} availability day(s) and ${bookableSlots} open slot(s) in the next 14 days.`,
    details: { availabilityDays: futureDays.length, bookableSlots },
  };
}

function countSlotsByGroomer(
  fromDate: string,
  days: number,
  groomerId: GroomerId,
  data: Awaited<ReturnType<typeof readSchedulingData>>
): number {
  let count = 0;
  for (let i = 0; i < days; i++) {
    const date = addDaysISO(fromDate, i);
    const slots = getAvailableSlotsForDate(
      date,
      data.availability,
      data.appointments,
      "full-groom"
    );
    count += slots.filter((s) => s.groomerId === groomerId).length;
  }
  return count;
}

function countAllSlots(
  fromDate: string,
  days: number,
  data: Awaited<ReturnType<typeof readSchedulingData>>
): number {
  let count = 0;
  for (let i = 0; i < days; i++) {
    const date = addDaysISO(fromDate, i);
    count += getAvailableSlotsForDate(
      date,
      data.availability,
      data.appointments,
      "full-groom"
    ).length;
  }
  return count;
}

async function checkScheduling(): Promise<QaCheckResult[]> {
  const data = await readSchedulingData();
  const today = todayISO();
  const slotHorizonDays = 14;

  const melanieSlots = countSlotsByGroomer(today, slotHorizonDays, "melanie", data);
  const diamondSlots = countSlotsByGroomer(today, slotHorizonDays, "diamond", data);
  const totalSlots = countAllSlots(today, slotHorizonDays, data);

  const melanie = groomerCalendarCheck("melanie", data.availability, melanieSlots);
  const diamond = groomerCalendarCheck("diamond", data.availability, diamondSlots);

  const slotsCheck: QaCheckResult = {
    id: "available_slots",
    label: "Available appointment slots",
    status: totalSlots > 0 ? "working" : "not_working",
    message:
      totalSlots > 0
        ? `${totalSlots} bookable slot(s) in the next ${slotHorizonDays} days (Melanie: ${melanieSlots}, Diamond: ${diamondSlots}).`
        : `No bookable slots in the next ${slotHorizonDays} days.`,
    details: {
      total: totalSlots,
      melanie: melanieSlots,
      diamond: diamondSlots,
      horizonDays: slotHorizonDays,
    },
  };

  const persist = persistenceStatus();
  const bookingCheck: QaCheckResult = {
    id: "booking",
    label: "Appointments can be booked",
    status:
      persist.writable && totalSlots > 0
        ? "working"
        : !persist.writable
          ? "not_working"
          : "warning",
    message: !persist.writable
      ? persist.message
      : totalSlots > 0
        ? "Redis persistence is configured and open slots are available for booking."
        : "Persistence OK but no open slots — customers cannot complete a booking right now.",
    details: {
      persistenceMode: persist.mode,
      writable: persist.writable,
      openSlots: totalSlots,
    },
  };

  return [melanie, diamond, slotsCheck, bookingCheck];
}

export async function runQaDiagnostics(
  trigger: "cron" | "manual" = "manual"
): Promise<QaDiagnosticReport> {
  const [website, email, sms, schedulingChecks] = await Promise.all([
    checkWebsite(),
    checkEmail(),
    checkSms(),
    checkScheduling(),
  ]);

  const checks = [website, email, sms, ...schedulingChecks];
  const report: QaDiagnosticReport = {
    ranAt: new Date().toISOString(),
    trigger,
    overall: overallStatus(checks),
    checks,
  };

  await saveQaReport(report);
  return report;
}

export async function saveQaReport(report: QaDiagnosticReport): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    await redis.set(QA_REDIS_KEY, report);
    return;
  }
  if (!process.env.VERCEL) {
    const { writeFile, mkdir } = await import("fs/promises");
    const path = await import("path");
    const dir = path.join(process.cwd(), "data");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "qa-report.json"),
      JSON.stringify(report, null, 2) + "\n",
      "utf8"
    );
  }
}

export async function loadQaReport(): Promise<QaDiagnosticReport | null> {
  const redis = getRedisClient();
  if (redis) {
    return (await redis.get<QaDiagnosticReport>(QA_REDIS_KEY)) ?? null;
  }
  if (!process.env.VERCEL) {
    try {
      const { readFile } = await import("fs/promises");
      const path = await import("path");
      const raw = await readFile(path.join(process.cwd(), "data", "qa-report.json"), "utf8");
      return JSON.parse(raw) as QaDiagnosticReport;
    } catch {
      return null;
    }
  }
  return null;
}
