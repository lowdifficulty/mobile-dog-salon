import { NextResponse } from "next/server";
import {
  processMetaWebhookPayload,
  verifyMetaWebhookChallenge,
  verifyMetaWebhookSignatureFromEnv,
} from "@/lib/meta/webhook";

export async function GET(request: Request) {
  const challenge = await verifyMetaWebhookChallenge(request);
  if (challenge) return challenge;
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  const valid = await verifyMetaWebhookSignatureFromEnv(rawBody, signature);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await processMetaWebhookPayload(
      payload as Parameters<typeof processMetaWebhookPayload>[0]
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Meta webhook processing failed:", err);
    return NextResponse.json({ ok: true, processed: 0, skipped: 0 });
  }
}
