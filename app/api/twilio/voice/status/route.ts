import { NextResponse } from "next/server";
import { readCrmData, updateInteraction } from "@/lib/crm/store";
import { mapTwilioCallStatus } from "@/lib/notifications/twilio-voice";

/** Twilio Voice status callback — updates CRM call interactions. */
export async function POST(request: Request) {
  const formData = await request.formData();
  const callSid = formData.get("CallSid")?.toString();
  const callStatus = formData.get("CallStatus")?.toString() || "";
  const durationRaw = formData.get("CallDuration")?.toString();
  const durationSeconds = durationRaw ? Number(durationRaw) : undefined;

  if (callSid) {
    try {
      const data = await readCrmData();
      const existing = data.interactions.find((i) => i.twilioSid === callSid);
      if (existing) {
        await updateInteraction(existing.id, {
          callStatus: mapTwilioCallStatus(callStatus),
          durationSeconds: Number.isFinite(durationSeconds)
            ? durationSeconds
            : existing.durationSeconds,
          summary: `Call ${callStatus}${durationSeconds ? ` (${durationSeconds}s)` : ""}`,
        });
      }
    } catch (err) {
      console.error("Voice status CRM update failed:", err);
    }
  }

  return new NextResponse("ok", { status: 200 });
}
