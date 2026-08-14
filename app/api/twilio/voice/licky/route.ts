import { NextResponse } from "next/server";
import { handleLickyVoiceTurn } from "@/lib/client/licky-voice";

/** Twilio Gather callback — one Licky voice turn. */
export async function POST(request: Request) {
  const formData = await request.formData();
  const callSid = formData.get("CallSid")?.toString() ?? "";
  const from = formData.get("From")?.toString() ?? "";
  const speech =
    formData.get("SpeechResult")?.toString() ||
    formData.get("UnstableSpeechResult")?.toString() ||
    "";

  const twiml = await handleLickyVoiceTurn({
    callSid,
    from,
    speech,
  });

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}
