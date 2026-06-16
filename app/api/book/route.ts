import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const data = await request.json();

  // Log booking request — replace with email service, CRM, or database as needed
  console.log("New booking request:", JSON.stringify(data, null, 2));

  return NextResponse.json({
    success: true,
    message: "Booking request received. We will confirm your appointment shortly.",
  });
}
