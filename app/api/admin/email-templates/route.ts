import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import {
  readEmailTemplates,
  updateEmailTemplate,
} from "@/lib/notifications/email-templates-store";
import type { EmailTemplateId } from "@/lib/notifications/email-template-types";
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/notifications/email-templates-defaults";

const VALID_IDS = new Set(Object.keys(DEFAULT_EMAIL_TEMPLATES));

export async function GET() {
  try {
    await requireAdmin();
    const templates = await readEmailTemplates();
    return NextResponse.json({ templates: Object.values(templates) });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      id?: EmailTemplateId;
      subject?: string;
      html?: string;
      enabled?: boolean;
    };

    if (!body.id || !VALID_IDS.has(body.id)) {
      return NextResponse.json({ error: "Invalid template id" }, { status: 400 });
    }

    const updated = await updateEmailTemplate(body.id, {
      subject: typeof body.subject === "string" ? body.subject : undefined,
      html: typeof body.html === "string" ? body.html : undefined,
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
    });

    return NextResponse.json({ template: updated });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
