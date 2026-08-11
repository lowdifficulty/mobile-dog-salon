import { NextResponse } from "next/server";
import { WebhooksHelper } from "square";

const WEBHOOK_URL = "https://mobiledog-salon.com/api/webhooks/square";

/** Square webhook — verifies signatures and acknowledges payment events. */
export async function POST(request: Request) {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim();
  if (!signatureKey) {
    return NextResponse.json({ error: "Square webhook not configured" }, { status: 503 });
  }

  const signatureHeader = request.headers.get("x-square-hmacsha256-signature");
  if (!signatureHeader) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await request.text();

  try {
    const valid = await WebhooksHelper.verifySignature({
      requestBody: payload,
      signatureHeader,
      signatureKey,
      notificationUrl: WEBHOOK_URL,
    });
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(payload) as { type?: string; event_id?: string };
    if (
      event.type === "payment.updated" ||
      event.type === "payment.created" ||
      event.type === "refund.updated"
    ) {
      console.log(`Square webhook: ${event.type}`, event.event_id);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Square webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
