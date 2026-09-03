import { NextResponse } from "next/server";
import { Resend } from "resend";
import { applyResendWebhookEvent } from "@/lib/notifications/email-analytics-store";
import { resolveResendWebhookSecret } from "@/lib/notifications/resend-webhook-config";

/** Resend webhook — delivery, open, click, bounce events. */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = await resolveResendWebhookSecret();

  let payload: { type?: string; created_at?: string; data?: { email_id?: string } };

  if (secret) {
    const id = request.headers.get("svix-id");
    const timestamp = request.headers.get("svix-timestamp");
    const signature = request.headers.get("svix-signature");
    if (!id || !timestamp || !signature) {
      return NextResponse.json({ error: "Missing signature headers" }, { status: 401 });
    }
    try {
      const resend = new Resend(process.env.RESEND_API_KEY || "re_unused");
      const verified = resend.webhooks.verify({
        payload: rawBody,
        headers: { id, timestamp, signature },
        webhookSecret: secret,
      }) as { type?: string; created_at?: string; data?: { email_id?: string } };
      payload = verified;
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    try {
      payload = JSON.parse(rawBody) as typeof payload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
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
