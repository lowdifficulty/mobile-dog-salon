import "server-only";
import { Resend } from "resend";
import type { Appointment } from "@/lib/scheduling/types";
import { buildIcsEvent } from "@/lib/scheduling/calendar";
import { appointmentSummaryLines } from "./appointment-format";
import { companyLegal } from "@/lib/company-legal";
import { sendBookingSms } from "./twilio";

const ORGANIZER_EMAIL =
  process.env.BOOKING_ORGANIZER_EMAIL ?? "bookings@mobiledog-salon.com";

export type ReminderKind = "24h" | "2h";

function reminderSubject(appointment: Appointment, kind: ReminderKind): string {
  const { when } = appointmentSummaryLines(appointment);
  if (kind === "24h") {
    return `Reminder: ${appointment.petName}'s grooming appointment is tomorrow — ${when.dateLine}`;
  }
  return `Reminder: ${appointment.petName}'s grooming appointment is today at ${when.startTime} PT`;
}

function reminderEmailHtml(appointment: Appointment, kind: ReminderKind): string {
  const { groomerName, serviceLabel, when } = appointmentSummaryLines(appointment);
  const lead =
    kind === "24h"
      ? `This is a friendly reminder that ${appointment.petName}'s Mobile Dog Salon appointment is coming up tomorrow.`
      : `This is a friendly reminder that ${appointment.petName}'s Mobile Dog Salon appointment is in about 2 hours.`;

  return `
    <p>Hi ${appointment.firstName},</p>
    <p>${lead}</p>
    <p>
      <strong>When:</strong> ${when.dateLine}<br/>
      <strong>Time:</strong> ${when.timeRange}<br/>
      <strong>Groomer:</strong> ${groomerName}<br/>
      <strong>Pet:</strong> ${appointment.petName} (${appointment.petBreed || "—"})<br/>
      <strong>Service:</strong> ${serviceLabel}<br/>
      <strong>Location:</strong> ${appointment.address}, ${appointment.city}
    </p>
    <p>Our groomer will arrive at your driveway. Please have your pet ready with access to water and a safe area for grooming.</p>
    <p>Questions? Reply to this email or call us at ${companyLegal.businessPhoneDisplay}.</p>
    <p>— Mobile Dog Salon</p>
  `;
}

function reminderSmsBody(appointment: Appointment, kind: ReminderKind): string {
  const { groomerName, serviceLabel, when } = appointmentSummaryLines(appointment);
  const lead =
    kind === "24h"
      ? `Reminder: ${appointment.petName}'s grooming is tomorrow.`
      : `Reminder: ${appointment.petName}'s grooming is in ~2 hours.`;

  return [
    `Mobile Dog Salon: ${lead}`,
    `${serviceLabel} · ${when.smsWhen}`,
    `Groomer: ${groomerName}`,
    `${appointment.address}, ${appointment.city}`,
    `Reply STOP to opt out. HELP for help.`,
  ].join("\n");
}

export async function sendReminderEmail(
  appointment: Appointment,
  kind: ReminderKind
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`Reminder email (${kind}) skipped — RESEND_API_KEY not set`);
    return false;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from =
    process.env.BOOKING_EMAIL_FROM ?? `Mobile Dog Salon <${ORGANIZER_EMAIL}>`;
  const ics = buildIcsEvent(appointment);

  await resend.emails.send({
    from,
    to: appointment.email,
    subject: reminderSubject(appointment, kind),
    html: reminderEmailHtml(appointment, kind),
    attachments: [
      {
        filename: "appointment.ics",
        content: Buffer.from(ics).toString("base64"),
        contentType: "text/calendar; method=REQUEST",
      },
    ],
  });

  return true;
}

export async function sendReminderSms(
  appointment: Appointment,
  kind: ReminderKind
): Promise<boolean> {
  if (!appointment.smsOptIn || !appointment.phone.trim()) {
    return false;
  }

  return sendBookingSms(appointment.phone, reminderSmsBody(appointment, kind));
}
