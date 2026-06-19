import "server-only";
import { Resend } from "resend";
import type { Appointment } from "@/lib/scheduling/types";
import { buildIcsEvent } from "@/lib/scheduling/calendar";
import { appointmentSummaryLines } from "./appointment-format";
import { sendBookingSms } from "./twilio";

const ORGANIZER_EMAIL =
  process.env.BOOKING_ORGANIZER_EMAIL ?? "bookings@mobiledog-salon.com";

export async function sendCustomerConfirmationEmail(
  appointment: Appointment
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log("Customer confirmation email skipped (RESEND_API_KEY not set)");
    return false;
  }

  const { groomerName, serviceLabel, when } = appointmentSummaryLines(appointment);
  const ics = buildIcsEvent(appointment);

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from =
    process.env.BOOKING_EMAIL_FROM ?? `Mobile Dog Salon <${ORGANIZER_EMAIL}>`;

  await resend.emails.send({
    from,
    to: appointment.email,
    subject: `Booking confirmed — ${appointment.petName} on ${when.dateLine}`,
    html: `
      <p>Hi ${appointment.firstName},</p>
      <p>Your Mobile Dog Salon appointment is confirmed.</p>
      <p>
        <strong>When:</strong> ${when.dateLine}<br/>
        <strong>Time:</strong> ${when.timeRange}<br/>
        <strong>Groomer:</strong> ${groomerName}<br/>
        <strong>Pet:</strong> ${appointment.petName} (${appointment.petBreed || "—"})<br/>
        <strong>Service:</strong> ${serviceLabel}<br/>
        <strong>Location:</strong> ${appointment.address}, ${appointment.city}
      </p>
      <p>We look forward to seeing you and ${appointment.petName}!</p>
      <p>Questions? Reply to this email or call us at (949) 755-8994.</p>
      <p>— Mobile Dog Salon</p>
    `,
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

export async function sendCustomerConfirmationSms(
  appointment: Appointment
): Promise<boolean> {
  if (!appointment.smsOptIn || !appointment.phone.trim()) {
    return false;
  }

  const { groomerName, serviceLabel, when } = appointmentSummaryLines(appointment);

  const body = [
    `Mobile Dog Salon: You're booked!`,
    `${appointment.petName} — ${serviceLabel}`,
    `${when.smsWhen}`,
    `Groomer: ${groomerName}`,
    `${appointment.address}, ${appointment.city}`,
    `Reply STOP to opt out. HELP for help.`,
  ].join("\n");

  return sendBookingSms(appointment.phone, body);
}

export async function sendBookingConfirmations(
  appointment: Appointment
): Promise<{ email: boolean; sms: boolean }> {
  const [email, sms] = await Promise.all([
    sendCustomerConfirmationEmail(appointment).catch((err) => {
      console.error("Customer confirmation email failed:", err);
      return false;
    }),
    sendCustomerConfirmationSms(appointment).catch((err) => {
      console.error("Customer confirmation SMS failed:", err);
      return false;
    }),
  ]);

  return { email, sms };
}
