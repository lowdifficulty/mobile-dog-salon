import "server-only";
import { sendCustomerConfirmationWithTemplate } from "./staff-booking-notify";
import { sendSms } from "./twilio";
import { formatBookingConfirmationSmsWhen } from "./appointment-format";
import type { Appointment } from "@/lib/scheduling/types";

export async function sendCustomerConfirmationEmail(
  appointment: Appointment
): Promise<boolean> {
  return sendCustomerConfirmationWithTemplate(appointment);
}

export function bookingConfirmationSmsBody(appointment: Appointment): string {
  const when = formatBookingConfirmationSmsWhen(appointment);
  return `This is Licky with Mobile Dog Salon. Your 50% discount is active. Appointment confirmed ${when}. Any special instructions for your pup?`;
}

export async function sendCustomerConfirmationSms(
  appointment: Appointment
): Promise<boolean> {
  if (!appointment.smsOptIn || !appointment.phone.trim()) {
    return false;
  }

  const body = bookingConfirmationSmsBody(appointment);

  const result = await sendSms(appointment.phone, body);
  if (result.ok) {
    try {
      const { recordSystemOutboundSms } = await import("@/lib/crm/messaging");
      await recordSystemOutboundSms({
        appointment,
        body,
        summary: "Booking confirmation SMS",
        twilioSid: result.sid,
        metadata: { appointmentId: appointment.id, kind: "booking_confirmation" },
      });
    } catch (err) {
      console.error("CRM log for confirmation SMS failed:", err);
    }
  }
  return result.ok;
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
