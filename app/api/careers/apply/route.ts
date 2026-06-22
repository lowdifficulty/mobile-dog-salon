import { NextResponse } from "next/server";
import { createJobApplication } from "@/lib/careers/store";
import { validateJobApplicationInput } from "@/lib/careers/validate";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = validateJobApplicationInput(body);
    const application = await createJobApplication(input);

    return NextResponse.json({
      success: true,
      applicationId: application.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not submit application";
    const status = message.startsWith("Please") || message.includes("must") ? 400 : 500;
    if (status === 500) {
      console.error("Job application failed:", err);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
