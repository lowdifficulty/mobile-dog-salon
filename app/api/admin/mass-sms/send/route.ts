import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import { sendMassSmsBatch } from "@/lib/mass-sms/send-batch";
import { getMassSmsStatus } from "@/lib/mass-sms/eligibility";
import type { MassSmsCampaignKind } from "@/lib/mass-sms/types";

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const body = (await request.json().catch(() => ({}))) as {
      batchSize?: number;
      kind?: MassSmsCampaignKind;
    };
    const kind = body.kind === "lead-nurture" ? "lead-nurture" : "rebook";
    const result = await sendMassSmsBatch({
      kind,
      batchSize: body.batchSize,
      actorEmail: user.email,
    });
    const status = await getMassSmsStatus(kind);
    return NextResponse.json({ kind, ...result, status });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
