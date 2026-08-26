import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import { sendMassSmsBatch } from "@/lib/mass-sms/send-batch";
import { getMassSmsStatus } from "@/lib/mass-sms/eligibility";

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const body = (await request.json().catch(() => ({}))) as { batchSize?: number };
    const result = await sendMassSmsBatch({
      batchSize: body.batchSize,
      actorEmail: user.email,
    });
    const status = await getMassSmsStatus();
    return NextResponse.json({ ...result, status });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
