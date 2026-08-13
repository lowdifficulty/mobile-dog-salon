import { NextResponse } from "next/server";
import { applyTwilioSmsStatus } from "@/lib/crm/sms-receipts";

/** Twilio SMS status callback — updates CRM messageStatus (delivered / failed). */
export async function POST(request: Request) {
  const formData = await request.formData();
  const messageSid =
    formData.get("MessageSid")?.toString() || formData.get("SmsSid")?.toString() || "";
  const messageStatus =
    formData.get("MessageStatus")?.toString() || formData.get("SmsStatus")?.toString() || "";
  const to = formData.get("To")?.toString() || "";
  const errorCode = formData.get("ErrorCode")?.toString() || "";
  const errorMessage = formData.get("ErrorMessage")?.toString() || "";

  if (messageSid && messageStatus) {
    try {
      await applyTwilioSmsStatus({
        messageSid,
        messageStatus,
        to,
        errorCode: errorCode || undefined,
        errorMessage: errorMessage || undefined,
      });
    } catch (err) {
      console.error("SMS status CRM update failed:", err);
    }
  }

  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { status: 200, headers: { "Content-Type": "text/xml" } }
  );
}
