import "server-only";
import { attachCallTranscript } from "@/lib/crm/call-recordings";
import { getTwilioClient } from "./twilio-client";
import { resolveTwilioAccountSid } from "./twilio-runtime-config";

function twilioAuthHeader(): string | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim();
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();

  if (apiKeySid && apiKeySecret) {
    return `Basic ${Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString("base64")}`;
  }
  if (accountSid && authToken) {
    return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
  }
  return null;
}

async function attachIfReady(
  recordingSid: string | undefined,
  callSid: string | undefined,
  transcript: string,
  transcriptionSid?: string
): Promise<void> {
  if (!transcript.trim()) return;
  await attachCallTranscript({
    recordingSid,
    callSid,
    transcript,
    transcriptionSid,
  });
}

/** Poll existing Twilio transcriptions for a recording (some accounts auto-transcribe). */
async function syncExistingTranscription(recordingSid: string): Promise<boolean> {
  const client = await getTwilioClient();
  if (!client) return false;
  try {
    const list = await client.recordings(recordingSid).transcriptions.list({ limit: 5 });
    const done = list.find((t) => t.status === "completed" && t.transcriptionText?.trim());
    if (done?.transcriptionText) {
      await attachIfReady(recordingSid, undefined, done.transcriptionText, done.sid);
      return true;
    }
  } catch (err) {
    console.error("Transcription list failed:", err);
  }
  return false;
}

/** Request classic recording transcription via REST (fallback when realtime TwiML is unavailable). */
export async function requestRecordingTranscription(
  recordingSid: string,
  transcriptionCallbackUrl: string
): Promise<void> {
  if (await syncExistingTranscription(recordingSid)) return;

  const accountSid = await resolveTwilioAccountSid();
  const auth = twilioAuthHeader();
  if (!accountSid || !auth) return;

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}/Transcriptions.json`,
      {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          TranscriptionCallback: transcriptionCallbackUrl,
          TranscriptionCallbackMethod: "POST",
        }).toString(),
      }
    );
    if (!res.ok) {
      console.error("Transcription create failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Transcription request failed:", err);
  }
}

/** Parse realtime or classic Twilio transcription webhook payloads. */
export async function handleTranscriptionWebhook(formData: FormData): Promise<void> {
  const callSid = formData.get("CallSid")?.toString() || "";
  const recordingSid = formData.get("RecordingSid")?.toString() || "";
  const transcriptionSid = formData.get("TranscriptionSid")?.toString() || undefined;
  const transcriptionText = formData.get("TranscriptionText")?.toString() || "";
  const transcriptionStatus = formData.get("TranscriptionStatus")?.toString() || "";
  const transcriptionEvent = formData.get("TranscriptionEvent")?.toString() || "";
  const transcriptionDataRaw = formData.get("TranscriptionData")?.toString() || "";

  let transcript = transcriptionText.trim();
  if (!transcript && transcriptionDataRaw) {
    try {
      const parsed = JSON.parse(transcriptionDataRaw) as {
        transcript?: string;
        text?: string;
      };
      transcript = (parsed.transcript || parsed.text || "").trim();
    } catch {
      transcript = transcriptionDataRaw.trim();
    }
  }

  if (!transcript) {
    if (
      (recordingSid || callSid) &&
      (transcriptionStatus === "completed" || transcriptionEvent === "transcription-stopped")
    ) {
      if (recordingSid) await syncExistingTranscription(recordingSid);
    }
    return;
  }

  if (
    transcriptionStatus === "completed" ||
    transcriptionEvent === "transcription-content" ||
    transcriptionEvent === "transcription-stopped"
  ) {
    await attachIfReady(recordingSid || undefined, callSid || undefined, transcript, transcriptionSid);
  }
}
