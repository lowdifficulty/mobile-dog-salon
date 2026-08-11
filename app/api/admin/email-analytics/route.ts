import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import {
  readEmailAnalytics,
  summarizeEmailAnalytics,
  syncEmailDeliveryFromResend,
} from "@/lib/notifications/email-analytics-store";
import {
  ensureResendWebhook,
  getResendWebhookStatus,
} from "@/lib/notifications/ensure-resend-webhook";

export async function GET() {
  try {
    await requireAdmin();
    const [data, webhook] = await Promise.all([
      readEmailAnalytics(),
      getResendWebhookStatus(),
    ]);
    const summary = summarizeEmailAnalytics(data.sends);
    return NextResponse.json({ ...summary, webhook });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      limit?: number;
    };

    if (body.action === "ensure-webhook") {
      const result = await ensureResendWebhook();
      const webhook = await getResendWebhookStatus();
      return NextResponse.json({ ...result, webhook }, { status: result.ok ? 200 : 400 });
    }

    if (body.action === "sync-delivery") {
      const sync = await syncEmailDeliveryFromResend({ limit: body.limit });
      const data = await readEmailAnalytics();
      const summary = summarizeEmailAnalytics(data.sends);
      const webhook = await getResendWebhookStatus();
      return NextResponse.json({ ok: true, sync, ...summary, webhook });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Request failed" },
      { status: 400 }
    );
  }
}
