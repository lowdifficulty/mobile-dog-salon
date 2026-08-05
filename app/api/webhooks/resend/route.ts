import { NextResponse } from "next/server";
import { applyResendWebhookEvent } from "@/lib/notifications/email-analytics-store";

/** Resend webhook — delivery, open, click, bounce events. */
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (secret) {
    const provided = request.headers.get("resend-signature") ?? request.headers.get("svix-signature");
    if (!provided) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    // Production: configure Svix verification when RESEND_WEBHOOK_SECRET is set.
    // Accept signed payloads from Resend dashboard webhook URL.
  }

  let payload: { type?: string; created_at?: string; data?: { email_id?: string } };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.type) {
    return NextResponse.json({ error: "Missing type" }, { status: 400 });
  }

  const updated = await applyResendWebhookEvent({
    type: payload.type,
    created_at: payload.created_at,
    data: payload.data,
  });

  return NextResponse.json({ ok: true, matched: updated });
}
