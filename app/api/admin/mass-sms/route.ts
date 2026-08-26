import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import { getMassSmsStatus, listMassSmsEligibleContacts } from "@/lib/mass-sms/eligibility";
import type { MassSmsCampaignKind } from "@/lib/mass-sms/types";

function parseKind(raw: string | null): MassSmsCampaignKind {
  return raw === "lead-nurture" ? "lead-nurture" : "rebook";
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const kind = parseKind(new URL(request.url).searchParams.get("kind"));
    const [contacts, status] = await Promise.all([
      listMassSmsEligibleContacts(kind),
      getMassSmsStatus(kind),
    ]);
    return NextResponse.json({ kind, contacts, status });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
