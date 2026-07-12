import { NextResponse } from "next/server";
import { sendInterviewConfirmationEmails } from "@/lib/interviews/confirmation-email";
import { createInterviewBooking } from "@/lib/interviews/store";
import { validateInterviewBookingInput } from "@/lib/interviews/validate";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = validateInterviewBookingInput(body);
    const booking = await createInterviewBooking(input);

    const emails = await sendInterviewConfirmationEmails(booking).catch((err) => {
      console.error("Interview confirmation emails failed:", err);
      return { candidate: false, manager: false };
    });

    return NextResponse.json({
      success: true,
      booking,
      emailsSent: emails,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not book interview";
    const status = message.includes("just booked") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
