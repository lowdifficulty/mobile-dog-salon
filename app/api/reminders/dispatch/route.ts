import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { dispatchAppointmentReminder } from "@/lib/notifications/dispatch-reminder";
import type { ReminderKind } from "@/lib/notifications/reminders";

async function verifyQStash(request: Request, rawBody: string): Promise<boolean> {
  const current = process.env.QSTASH_CURRENT_SIGNING_KEY?.trim();
  const next = process.env.QSTASH_NEXT_SIGNING_KEY?.trim();
  if (!current && !next) {
    return process.env.NODE_ENV !== "production";
  }

  const receiver = new Receiver({
    currentSigningKey: current ?? "",
    nextSigningKey: next ?? "",
  });

  await receiver.verify({
    signature: request.headers.get("upstash-signature") ?? "",
    body: rawBody,
  });
  return true;
}

/** QStash callback — send a single 24h or 2h reminder for one appointment. */
export async function POST(request: Request) {
  const rawBody = await request.text();

  try {
    await verifyQStash(request, rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: { appointmentId?: string; kind?: ReminderKind };
  try {
    body = JSON.parse(rawBody) as { appointmentId?: string; kind?: ReminderKind };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.appointmentId || (body.kind !== "24h" && body.kind !== "2h")) {
    return NextResponse.json({ error: "Missing appointmentId or kind" }, { status: 400 });
  }

  try {
    const result = await dispatchAppointmentReminder(body.appointmentId, body.kind);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Reminder dispatch failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Dispatch failed" },
      { status: 500 }
    );
  }
}
