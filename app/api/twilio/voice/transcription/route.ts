import { NextResponse } from "next/server";
import { handleTranscriptionWebhook } from "@/lib/notifications/twilio-call-transcription";

/** Twilio transcription callback — adds transcript text to the CRM call thread. */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    await handleTranscriptionWebhook(formData);
  } catch (err) {
    console.error("Transcription CRM attach failed:", err);
  }

  return new NextResponse("ok", { status: 200 });
}
