import "server-only";
import { appointmentEmailVariables } from "./appointment-email-vars";
import { sendTemplatedEmail } from "./send-templated-email";
import { appointmentSummaryLines } from "./appointment-format";
import { formatAppointmentAddress } from "@/lib/scheduling/address";
import { getAppointmentPetLabel } from "@/lib/booking/pets";
import type { Appointment } from "@/lib/scheduling/types";

export type ReminderKind = "24h" | "1h";

export function reminderSmsBody(appointment: Appointment, kind: ReminderKind): string {
  const { groomerName, serviceLabel, when } = appointmentSummaryLines(appointment);
  const petLabel = getAppointmentPetLabel(appointment);
  const lead =
    kind === "24h"
      ? `Reminder: ${petLabel}'s grooming is tomorrow.`
      : `Reminder: ${petLabel}'s grooming is in about one hour.`;

  return [
    `Mobile Dog Salon: ${lead}`,
    `${serviceLabel} · ${when.smsWhen}`,
    `Groomer: ${groomerName}`,
    formatAppointmentAddress(appointment),
    `Reply STOP to opt out. HELP for help.`,
  ].join("\n");
}

export async function sendReminderEmail(
  appointment: Appointment,
  kind: ReminderKind
): Promise<boolean> {
  const templateId = kind === "24h" ? "reminder_24h" : "reminder_1h";
  const vars = appointmentEmailVariables(appointment);
  const result = await sendTemplatedEmail({
    templateId,
    to: appointment.email,
    variables: vars,
    appointmentId: appointment.id,
  });
  return result.ok;
}

export async function sendReminderSms(
  appointment: Appointment,
  kind: ReminderKind
): Promise<boolean> {
  if (!appointment.smsOptIn || !appointment.phone.trim()) {
    return false;
  }
  const body = reminderSmsBody(appointment, kind);
  const { sendSms } = await import("./twilio");
  const result = await sendSms(appointment.phone, body);
  if (result.ok) {
    try {
      const { recordSystemOutboundSms } = await import("@/lib/crm/messaging");
      await recordSystemOutboundSms({
        appointment,
        body,
        summary: kind === "24h" ? "24h reminder SMS" : "1h reminder SMS",
        twilioSid: result.sid,
        metadata: {
          appointmentId: appointment.id,
          kind: kind === "24h" ? "reminder24hSmsSentAt" : "reminder1hSmsSentAt",
        },
      });
    } catch (err) {
      console.error("CRM log for reminder SMS failed:", err);
    }
  }
  return result.ok;
}
