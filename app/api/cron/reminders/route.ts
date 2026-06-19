import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { processDueReminders } from "@/lib/notifications/process-reminders";

/** Vercel Cron: appointment email/SMS reminders (24h + 2h before). */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
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
