import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import {
  ALL_TEMPLATE_IDS,
  sendAllTestEmails,
  sendTestEmail,
} from "@/lib/notifications/send-test-emails";
import type { EmailTemplateId } from "@/lib/notifications/email-template-types";
import { TEST_EMAIL_FROM } from "@/lib/notifications/email-test-sample";

const VALID_IDS = new Set(ALL_TEMPLATE_IDS);

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      to?: string;
      templateId?: EmailTemplateId | "all";
    };

    const to = body.to?.trim() ?? "";
    if (!isValidEmail(to)) {
      return NextResponse.json({ error: "Valid recipient email required" }, { status: 400 });
    }

    const templateId = body.templateId ?? "all";

    if (templateId === "all") {
      const { results } = await sendAllTestEmails(to);
      const failed = results.filter((r) => !r.ok);
      return NextResponse.json({
        ok: failed.length === 0,
        from: TEST_EMAIL_FROM,
        results,
        sent: results.filter((r) => r.ok).length,
        failed: failed.length,
      });
    }

    if (!VALID_IDS.has(templateId)) {
      return NextResponse.json({ error: "Invalid template id" }, { status: 400 });
    }

    const result = await sendTestEmail(templateId, to);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, from: TEST_EMAIL_FROM, error: result.error ?? "Send failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      from: TEST_EMAIL_FROM,
      templateId,
      resendId: result.resendId,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
