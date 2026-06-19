import { NextResponse } from "next/server";
import { processDueReminders } from "@/lib/notifications/process-reminders";

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

/** Vercel Cron: appointment email/SMS reminders (24h + 2h before). */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDueReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Reminder cron failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Reminder cron failed" },
      { status: 500 }
    );
  }
}
