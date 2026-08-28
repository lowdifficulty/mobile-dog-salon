import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/scheduling/auth";
import { findContactById } from "@/lib/crm/store";
import { sendStaffSms } from "@/lib/crm/messaging";
import {
  buildAppointmentFollowUpSms,
  buildLeadFollowUpSms,
} from "@/lib/crm/sms-bot";
import { sendTeamSms } from "@/lib/crm/team-sms";
import { isTeamSmsContactId } from "@/lib/crm/team-sms-constants";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireStaff();
    const { id } = await params;

    const body = (await request.json()) as {
      body?: string;
      template?: "lead_follow_up" | "appointment_follow_up";
      recipients?: string[];
    };

    if (isTeamSmsContactId(id)) {
      const text = body.body?.trim() || "";
      if (!text) {
        return NextResponse.json({ error: "Message body is required" }, { status: 400 });
      }

      const result = await sendTeamSms({
        body: text,
        recipientPhones: body.recipients,
        staffUserId: user.email || user.name,
        staffName: user.name,
      });

      if (!result.ok) {
        return NextResponse.json(
          {
            error: result.error || "Failed to send team SMS",
            interaction: result.interaction,
            sentCount: result.sentCount,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        ok: true,
        interaction: result.interaction,
        sentCount: result.sentCount,
        warning: result.error,
      });
    }

    const contact = await findContactById(id);
    if (!contact) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let text = body.body?.trim() || "";
    if (!text && body.template === "lead_follow_up") {
      text = buildLeadFollowUpSms(contact);
    } else if (!text && body.template === "appointment_follow_up") {
      text = buildAppointmentFollowUpSms(contact);
    }

    if (!text) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    const result = await sendStaffSms({
      phone: contact.phoneE164 || contact.phone,
      body: text,
      contactId: contact.id,
      staffUserId: user.email || user.name,
      staffName: user.name,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "Failed to send SMS", interaction: result.interaction },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, interaction: result.interaction });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
