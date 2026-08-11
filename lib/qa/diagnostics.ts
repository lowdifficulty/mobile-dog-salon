import "server-only";
import twilio from "twilio";
import { slotHoldsStatus, testSlotHoldSystem } from "@/lib/scheduling/slot-holds";
import { readSchedulingData } from "@/lib/scheduling/store";
import { getCustomerAvailableSlotsForDate } from "@/lib/scheduling/customer-availability";
import { listBookingBlockStarts } from "@/lib/scheduling/availability";
import { persistenceStatus } from "@/lib/scheduling/persistence";
import type { GroomerId } from "@/lib/scheduling/types";
import { GROOMERS } from "@/lib/scheduling/groomers";
import { getRedisClient } from "@/lib/scheduling/redis-client";
import {
  getPaymentProvider,
  isPaymentsConfigured,
} from "@/lib/payments/gateway";
import { getStripeAccountStatus } from "@/lib/payments/stripe";
import { getSquareAccountStatus } from "@/lib/payments/square";

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

const CHECK_STATUS_ORDER: Record<QaCheckStatus, number> = {
  not_working: 0,
  warning: 1,
  working: 2,
};

export function sortQaChecks(checks: QaCheckResult[]): QaCheckResult[] {
  return [...checks].sort(
    (a, b) => CHECK_STATUS_ORDER[a.status] - CHECK_STATUS_ORDER[b.status]
  );
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
  const { resolveTwilioAccountSid, resolveTwilioFromNumber } = await import(
    "@/lib/notifications/twilio-runtime-config"
  );
  const accountSid =
    process.env.TWILIO_ACCOUNT_SID?.trim() || (await resolveTwilioAccountSid());
  const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim();
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from =
    process.env.TWILIO_FROM_NUMBER?.trim() || (await resolveTwilioFromNumber());

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

async function checkPayments(): Promise<QaCheckResult> {
  const id = "payments";
  const label = "Payment System Working";

  if (!isPaymentsConfigured()) {
    return {
      id,
      label,
      status: "not_working",
      message:
        "Payments are not configured yet (set Stripe or Square credentials in Vercel).",
      details: { configured: false },
    };
  }

  const provider = getPaymentProvider();

  try {
    if (provider === "stripe") {
      const status = await getStripeAccountStatus();
      if (!status.ok) {
        return {
          id,
          label,
          status: "not_working",
          message: status.error ?? "Stripe connection failed",
          details: { configured: true, provider },
        };
      }
      return {
        id,
        label,
        status: "working",
        message: `Stripe ${status.livemode ? "live" : "test"} mode is connected.`,
        details: { configured: true, provider, livemode: Boolean(status.livemode) },
      };
    }

    if (provider === "square") {
      const status = await getSquareAccountStatus();
      if (!status.ok) {
        return {
          id,
          label,
          status: "not_working",
          message: status.error ?? "Square connection failed",
          details: { configured: true, provider },
        };
      }
      return {
        id,
        label,
        status: "working",
        message: `Square ${status.environment} mode is connected${status.locationName ? ` (${status.locationName})` : ""}.`,
        details: {
          configured: true,
          provider,
          environment: status.environment ?? "unknown",
          locationId: status.locationId ?? "",
        },
      };
    }

    return {
      id,
      label,
      status: "not_working",
      message: "No active payment provider.",
      details: { configured: false },
    };
  } catch (err) {
    return {
      id,
      label,
      status: "not_working",
      message: err instanceof Error ? err.message : "Payment system check failed",
      details: { configured: true, provider },
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
    const slots = getCustomerAvailableSlotsForDate(
      date,
      data,
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
    count += getCustomerAvailableSlotsForDate(
      date,
      data,
      "full-groom"
    ).length;
  }
  return count;
}

function groomerPublicParityCheck(
  groomerId: GroomerId,
  data: Awaited<ReturnType<typeof readSchedulingData>>,
  horizonDays: number
): QaCheckResult {
  const today = todayISO();
  const end = addDaysISO(today, horizonDays);
  let markedDays = 0;
  let mismatchDays = 0;
  const examples: string[] = [];

  for (const day of data.availability) {
    if (day.groomerId !== groomerId || day.date < today || day.date > end) continue;
    const blocks = listBookingBlockStarts(day.times, groomerId);
    if (blocks.length === 0) continue;
    markedDays++;
    const pub = getCustomerAvailableSlotsForDate(day.date, data, "full-groom").filter(
      (s) => s.groomerId === groomerId
    );
    if (pub.length === 0) {
      mismatchDays++;
      if (examples.length < 5) examples.push(day.date);
    }
  }

  const name = GROOMERS[groomerId].name;
  return {
    id: `${groomerId}_public_parity`,
    label: `${name} portal vs public calendar`,
    status:
      mismatchDays === 0
        ? "working"
        : mismatchDays > Math.max(1, markedDays / 2)
          ? "not_working"
          : "warning",
    message:
      mismatchDays === 0
        ? `All ${markedDays} shift day(s) in the next ${horizonDays} days offer public bookable slots.`
        : `${mismatchDays} of ${markedDays} shift day(s) appear in the groomer portal but have zero public slots (e.g. ${examples.join(", ")}). Check appointments, van overlap, or stale booking holds.`,
    details: { markedDays, mismatchDays, exampleDates: examples.join(", "), horizonDays },
  };
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

  return [melanie, diamond, groomerPublicParityCheck("melanie", data, 60), slotsCheck, bookingCheck, await checkSlotHolds()];
}

async function checkSlotHolds(): Promise<QaCheckResult> {
  const status = slotHoldsStatus();
  const test = await testSlotHoldSystem();

  if (!status.supported) {
    return {
      id: "slot_holds",
      label: "Slot holds (booking timer)",
      status: "not_working",
      message: status.message,
      details: {
        backend: status.backend,
        ttlSeconds: status.ttlSeconds,
      },
    };
  }

  return {
    id: "slot_holds",
    label: "Slot holds (booking timer)",
    status: test.ok ? "working" : "not_working",
    message: test.ok ? test.message : `${test.message} (${status.backend})`,
    details: {
      backend: status.backend,
      ttlSeconds: status.ttlSeconds,
      ...(test.details ?? {}),
    },
  };
}

export async function runQaDiagnostics(
  trigger: "cron" | "manual" = "manual"
): Promise<QaDiagnosticReport> {
  const [website, email, sms, payments, schedulingChecks] = await Promise.all([
    checkWebsite(),
    checkEmail(),
    checkSms(),
    checkPayments(),
    checkScheduling(),
  ]);

  const checks = sortQaChecks([website, email, sms, payments, ...schedulingChecks]);
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
