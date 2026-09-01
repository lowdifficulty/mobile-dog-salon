import { NextResponse } from "next/server";
import { createInterviewBooking } from "@/lib/interviews/store";
import { validateInterviewBookingInput } from "@/lib/interviews/validate";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = validateInterviewBookingInput(body);
    const booking = await createInterviewBooking(input);

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not book interview";
    const status = message.includes("just booked") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
