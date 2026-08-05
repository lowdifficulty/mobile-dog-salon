import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import {
  readEmailAnalytics,
  summarizeEmailAnalytics,
} from "@/lib/notifications/email-analytics-store";

export async function GET() {
  try {
    await requireAdmin();
    const data = await readEmailAnalytics();
    const summary = summarizeEmailAnalytics(data.sends);
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
