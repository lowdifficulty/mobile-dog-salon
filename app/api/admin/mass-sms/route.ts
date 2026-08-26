import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import { getMassSmsStatus, listMassSmsEligibleContacts } from "@/lib/mass-sms/eligibility";

export async function GET() {
  try {
    await requireAdmin();
    const [contacts, status] = await Promise.all([
      listMassSmsEligibleContacts(),
      getMassSmsStatus(),
    ]);
    return NextResponse.json({ contacts, status });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
