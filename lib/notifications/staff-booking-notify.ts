import "server-only";
import type { Appointment } from "@/lib/scheduling/types";
import { buildIcsEvent } from "@/lib/scheduling/calendar";
import { appointmentEmailVariables } from "./appointment-email-vars";
import { customerNotificationEmail } from "@/lib/booking/customer-email";
import { sendTemplatedEmail } from "./send-templated-email";
import { GROOMERS, MELANIE_BOOKING_NOTIFY_EMAILS } from "@/lib/scheduling/groomers";

export async function sendStaffBookingNotifications(
  appointment: Appointment
): Promise<{ groomer: boolean; melanie: boolean }> {
  const vars = appointmentEmailVariables(appointment);
  const groomer = GROOMERS[appointment.groomerId];

  const [groomerResult, melanieResult] = await Promise.all([
    sendTemplatedEmail({
      templateId: "staff_new_booking",
      to: [groomer.email, groomer.calendarEmail],
      variables: vars,
      appointmentId: appointment.id,
    }).catch((err) => {
      console.error("Groomer booking email failed:", err);
      return { ok: false };
    }),
    sendTemplatedEmail({
      templateId: "melanie_new_lead",
      to: [...MELANIE_BOOKING_NOTIFY_EMAILS],
      variables: vars,
      appointmentId: appointment.id,
    }).catch((err) => {
      console.error("Melanie lead email failed:", err);
      return { ok: false };
    }),
  ]);

  return { groomer: groomerResult.ok, melanie: melanieResult.ok };
}

export async function sendCustomerConfirmationWithTemplate(
  appointment: Appointment
): Promise<boolean> {
  const to = customerNotificationEmail(appointment.email);
  if (!to) {
    console.log(
      `Skipping confirmation email — customer did not provide an email (${appointment.id})`
    );
    return false;
  }

  const vars = appointmentEmailVariables(appointment);
  const ics = buildIcsEvent(appointment);

  const result = await sendTemplatedEmail({
    templateId: "booking_confirmation",
    to,
    variables: vars,
    appointmentId: appointment.id,
    attachments: [
      {
        filename: "appointment.ics",
        content: Buffer.from(ics).toString("base64"),
        contentType: "text/calendar; method=REQUEST",
      },
    ],
  });

  return result.ok;
}
