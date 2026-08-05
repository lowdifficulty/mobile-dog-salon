import "server-only";
import { DEFAULT_EMAIL_TEMPLATES } from "./email-templates-defaults";
import {
  sampleConfirmationAttachment,
  sampleEmailVariables,
  TEST_EMAIL_FROM,
} from "./email-test-sample";
import { sendTemplatedEmail } from "./send-templated-email";
import type { EmailTemplateId } from "./email-template-types";

const ALL_TEMPLATE_IDS = Object.keys(DEFAULT_EMAIL_TEMPLATES) as EmailTemplateId[];

function attachmentsForTemplate(id: EmailTemplateId) {
  if (id === "booking_confirmation") {
    return [sampleConfirmationAttachment()];
  }
  return undefined;
}

export async function sendTestEmail(
  templateId: EmailTemplateId,
  to: string
): Promise<{ ok: boolean; error?: string; resendId?: string }> {
  const vars = sampleEmailVariables({ email: to });
  const result = await sendTemplatedEmail({
    templateId,
    to,
    variables: vars,
    from: TEST_EMAIL_FROM,
    forceSend: true,
    subjectPrefix: "[TEST] ",
    attachments: attachmentsForTemplate(templateId),
  });

  if (!result.ok) {
    return {
      ok: false,
      error:
        result.error ??
        (process.env.RESEND_API_KEY
          ? "Send failed — check Resend domain and team@ sender"
          : "RESEND_API_KEY is not set"),
    };
  }

  return { ok: true, resendId: result.resendId };
}

export async function sendAllTestEmails(
  to: string
): Promise<{ results: { templateId: EmailTemplateId; ok: boolean; error?: string }[] }> {
  const results: { templateId: EmailTemplateId; ok: boolean; error?: string }[] = [];

  for (const templateId of ALL_TEMPLATE_IDS) {
    const sent = await sendTestEmail(templateId, to);
    results.push({
      templateId,
      ok: sent.ok,
      error: sent.error,
    });
  }

  return { results };
}

export { ALL_TEMPLATE_IDS };
