import "server-only";
import { Resend } from "resend";
import { getEmailTemplate } from "./email-templates-store";
import { renderEmailTemplate } from "./template-render";
import { logEmailSend } from "./email-analytics-store";
import type { EmailTemplateId } from "./email-template-types";
import type { EmailTemplateVariable } from "./email-template-types";

const ORGANIZER_EMAIL =
  process.env.BOOKING_ORGANIZER_EMAIL ?? "bookings@mobiledog-salon.com";

export interface SendTemplatedEmailInput {
  templateId: EmailTemplateId;
  to: string | string[];
  variables: Partial<Record<EmailTemplateVariable, string>>;
  appointmentId?: string;
  leadId?: string;
  attachments?: {
    filename: string;
    content: string;
    contentType?: string;
  }[];
  /** Override From header (e.g. team@ for admin test sends). */
  from?: string;
  /** Send even when template is disabled (admin tests). */
  forceSend?: boolean;
  /** Prepended to subject (e.g. "[TEST]"). */
  subjectPrefix?: string;
}

export async function sendTemplatedEmail(
  input: SendTemplatedEmailInput
): Promise<{ ok: boolean; resendId?: string }> {
  const template = await getEmailTemplate(input.templateId);
  if (!template.enabled && !input.forceSend) {
    console.log(`Email template disabled: ${input.templateId}`);
    return { ok: false };
  }

  if (!process.env.RESEND_API_KEY) {
    console.log(`Email skipped (${input.templateId}) — RESEND_API_KEY not set`);
    return { ok: false };
  }

  const subject = `${input.subjectPrefix ?? ""}${renderEmailTemplate(template.subject, input.variables)}`;
  const html = renderEmailTemplate(template.html, input.variables);
  const to = Array.isArray(input.to) ? input.to : [input.to];

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from =
    input.from ??
    process.env.BOOKING_EMAIL_FROM ??
    `Mobile Dog Salon <${ORGANIZER_EMAIL}>`;

  const result = await resend.emails.send({
    from,
    to,
    subject,
    html,
    tags: [
      { name: "template", value: input.templateId },
      ...(input.forceSend ? [{ name: "test_send", value: "true" }] : []),
      ...(input.appointmentId
        ? [{ name: "appointment_id", value: input.appointmentId }]
        : []),
    ],
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  });

  if (result.error) {
    console.error(`Resend send failed (${input.templateId}):`, result.error);
    return { ok: false };
  }

  const resendId = result.data?.id;
  for (const recipient of to) {
    await logEmailSend({
      resendId,
      templateId: input.templateId,
      to: recipient,
      subject,
      appointmentId: input.appointmentId,
      leadId: input.leadId,
    });
  }

  return { ok: true, resendId };
}
