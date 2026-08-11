import { NextResponse } from "next/server";
import { attachCallRecording } from "@/lib/crm/call-recordings";
import { requestRecordingTranscription } from "@/lib/notifications/twilio-call-transcription";
import { crmPublicBaseUrl } from "@/lib/crm/public-url";

/** Twilio recording status callback — stores dual-channel recording on the CRM call thread. */
export async function POST(request: Request) {
  const formData = await request.formData();
  const callSid = formData.get("CallSid")?.toString() || "";
  const parentCallSid = formData.get("ParentCallSid")?.toString() || null;
  const recordingSid = formData.get("RecordingSid")?.toString() || "";
  const recordingUrl = formData.get("RecordingUrl")?.toString() || "";
  const recordingStatus = formData.get("RecordingStatus")?.toString() || "";
  const recordingChannels = formData.get("RecordingChannels")?.toString() || "dual";
  const durationRaw = formData.get("RecordingDuration")?.toString();
  const recordingDurationSeconds = durationRaw ? Number(durationRaw) : undefined;

  if (recordingStatus === "completed" && recordingSid && callSid) {
    try {
      await attachCallRecording({
        callSid,
        parentCallSid,
        recordingSid,
        recordingUrl,
        recordingChannels,
        recordingDurationSeconds: Number.isFinite(recordingDurationSeconds)
          ? recordingDurationSeconds
          : undefined,
      });

      const base = await crmPublicBaseUrl(request);
      await requestRecordingTranscription(
        recordingSid,
        `${base}/api/twilio/voice/transcription`
      );
    } catch (err) {
      console.error("Recording CRM attach failed:", err);
    }
  }

  return new NextResponse("ok", { status: 200 });
}
