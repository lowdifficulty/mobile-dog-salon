import "server-only";
import type { Appointment } from "@/lib/scheduling/types";
import { buildIcsEvent } from "@/lib/scheduling/calendar";
import { appointmentEmailVariables } from "./appointment-email-vars";
import {
  groomerNewBookingSmsBody,
  ownerNewBookingSmsBody,
} from "./appointment-format";
import { customerNotificationEmail } from "@/lib/booking/customer-email";
import { sendTemplatedEmail } from "./send-templated-email";
import { GROOMERS, MELANIE_BOOKING_NOTIFY_EMAILS } from "@/lib/scheduling/groomers";
import {
  GROOMER_BOOKING_SMS_PHONES,
  OWNER_BOOKING_NOTIFY_PHONE,
} from "./staff-sms-recipients";

async function openSlotsNext7Days(): Promise<number> {
  const { readSchedulingData } = await import("@/lib/scheduling/store");
  const { shiftAnalyticsSummary } = await import("@/lib/scheduling/shift-analytics");
  const data = await readSchedulingData();
  return shiftAnalyticsSummary(data).available.days7;
}

async function sendStaffBookingSms(appointment: Appointment): Promise<void> {
  const { sendSms } = await import("./twilio");
  const { ensureAppointmentShortCode } = await import(
    "@/lib/scheduling/appointment-short-link"
  );
  const { appointment: linked, url } = await ensureAppointmentShortCode(appointment);
  const groomerPhone = GROOMER_BOOKING_SMS_PHONES[linked.groomerId];
  let openNext7 = 0;
  try {
    openNext7 = await openSlotsNext7Days();
  } catch (err) {
    console.error("Could not count 7-day availability for owner SMS:", err);
  }

  const sends: Promise<unknown>[] = [
    sendSms(OWNER_BOOKING_NOTIFY_PHONE, ownerNewBookingSmsBody(linked, openNext7, url), {
      skipOptOutCheck: true,
    }).then((result) => {
      if (!result.ok) {
        console.error("Owner booking SMS failed:", result.error);
      }
    }),
  ];

  if (groomerPhone) {
    sends.push(
      sendSms(groomerPhone, groomerNewBookingSmsBody(linked, url), {
        skipOptOutCheck: true,
      }).then((result) => {
        if (!result.ok) {
          console.error("Groomer booking SMS failed:", result.error);
        }
      })
    );
  }

  await Promise.all(sends);
}

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
    sendStaffBookingSms(appointment).catch((err) => {
      console.error("Staff booking SMS failed:", err);
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
