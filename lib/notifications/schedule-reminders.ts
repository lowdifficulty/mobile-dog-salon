import "server-only";
import { Client } from "@upstash/qstash";
import type { Appointment } from "@/lib/scheduling/types";
import {
  msUntilAppointment,
  REMINDER_24H_MS,
  REMINDER_1H_MS,
  REBOOK_3W_MS,
} from "./appointment-format";
import type { ReminderKind } from "./reminders";

export type ScheduledEmailKind = ReminderKind | "rebook-3w";

function reminderDelayMs(kind: ReminderKind, appointment: Appointment): number | null {
  const msUntil = msUntilAppointment(appointment);
  const target = kind === "24h" ? REMINDER_24H_MS : REMINDER_1H_MS;
  const delay = msUntil - target;
  return delay > 60_000 ? delay : null;
}

function rebookDelayMs(appointment: Appointment): number | null {
  const startMs = new Date(appointment.startAt).getTime();
  const targetMs = startMs + REBOOK_3W_MS;
  const delay = targetMs - Date.now();
  return delay > 60_000 ? delay : null;
}

function dispatchUrl(): string | null {
  const base =
    process.env.QSTASH_CALLBACK_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (!base) return null;
  const normalized = base.startsWith("http") ? base : `https://${base}`;
  return `${normalized.replace(/\/$/, "")}/api/reminders/dispatch`;
}

export async function scheduleAppointmentReminders(
  appointment: Appointment
): Promise<{ scheduled: ScheduledEmailKind[]; skipped: string[] }> {
  const token = process.env.QSTASH_TOKEN?.trim();
  const url = dispatchUrl();
  const result = { scheduled: [] as ScheduledEmailKind[], skipped: [] as string[] };

  if (!token || !url) {
    result.skipped.push("QStash not configured (QSTASH_TOKEN or callback URL missing)");
    return result;
  }

  const client = new Client({ token });

  for (const kind of ["24h", "1h"] as const) {
    const delayMs = reminderDelayMs(kind, appointment);
    if (delayMs === null) {
      result.skipped.push(`${kind} (appointment too soon)`);
      continue;
    }

    const notBefore = Math.floor((Date.now() + delayMs) / 1000);

    await client.publishJSON({
      url,
      body: { appointmentId: appointment.id, kind },
      notBefore,
      retries: 3,
    });

    result.scheduled.push(kind);
  }

  const rebookDelay = rebookDelayMs(appointment);
  if (rebookDelay === null) {
    result.skipped.push("rebook-3w (appointment too soon or in the past)");
  } else {
    const notBefore = Math.floor((Date.now() + rebookDelay) / 1000);
    await client.publishJSON({
      url,
      body: { appointmentId: appointment.id, kind: "rebook-3w" },
      notBefore,
      retries: 3,
    });
    result.scheduled.push("rebook-3w");
  }

  return result;
}
