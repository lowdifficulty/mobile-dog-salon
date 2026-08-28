import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/scheduling/auth";
import {
  addTeamParticipantPhone,
  ensureTeamSmsContact,
  listTeamParticipants,
} from "@/lib/crm/team-sms";

export async function GET() {
  try {
    await requireStaff();
    const contact = await ensureTeamSmsContact();
    return NextResponse.json({
      participants: listTeamParticipants(contact),
      contactId: contact.id,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireStaff();
    const body = (await request.json()) as { phone?: string; name?: string };
    const phone = body.phone?.trim() || "";
    if (!phone) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    }

    const result = await addTeamParticipantPhone(phone, body.name?.trim());
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Could not add participant" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      participants: listTeamParticipants(result.contact),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
